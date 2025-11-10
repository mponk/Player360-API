// routes/sessions.store.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

const router = express.Router();

// ---- Helpers ----------------------------------------------------
const mustEnv = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
};
const MONGO_URI = mustEnv('MONGODB_URI');

let mongo;
async function getDb() {
  if (!mongo) {
    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
  }
  return mongo.db();
}

// Robust auth: verify token locally, ensure role coach unless overridden
function requireAuth(roles = ['coach']) {
  const allow = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    try {
      const h = req.headers.authorization || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      const payload = jwt.verify(token, mustEnv('JWT_SECRET'));
      req.user = payload;
      if (allow.length && !allow.includes(payload.role)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

// accept both: [{...}] or {items:[{...}]}
function normalizeItems(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.items)) return body.items;
  return null;
}

function normalizeSessionId(sessionIdRaw) {
  if (!sessionIdRaw || sessionIdRaw === 'today') {
    // pakai tanggal server (cukup untuk case kita)
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }
  return sessionIdRaw;
}

// ---- Attendance -------------------------------------------------
router.post('/sessions/:sessionId/attendance', requireAuth('coach'), async (req, res) => {
  try {
    const items = normalizeItems(req.body);
    if (!items) {
      return res.status(400).json({ error: 'invalid_data', message: 'Attendance must be an array' });
    }
    // validate
    const allowed = new Set(['present', 'excused', 'absent']);
    for (const it of items) {
      if (typeof it.number !== 'number' || !allowed.has((it.status || '').toLowerCase())) {
        return res.status(400).json({ error: 'invalid_data', message: 'Invalid number/status' });
      }
      it.status = it.status.toLowerCase();
    }

    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    await db.collection('attendance').updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          items,
          coachId: req.user.id,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    res.json({ ok: true, saved: items.length });
  } catch (e) {
    console.error('attendance save error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/sessions/:sessionId/attendance', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    const doc = await db.collection('attendance').findOne({ sessionId });
    res.json(doc || { sessionId, items: [] });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// ---- Ratings / Performance -------------------------------------
router.post('/sessions/:sessionId/ratings', requireAuth('coach'), async (req, res) => {
  try {
    const items = normalizeItems(req.body);
    if (!items) {
      return res.status(400).json({ error: 'invalid_data', message: 'Ratings must be an array' });
    }
    for (const it of items) {
      if (typeof it.number !== 'number') {
        return res.status(400).json({ error: 'invalid_data', message: 'Missing player number' });
      }
      if (typeof it.rating !== 'number' || it.rating < 1 || it.rating > 5) {
        return res.status(400).json({ error: 'invalid_data', message: 'Rating must be 1..5' });
      }
    }
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    await db.collection('ratings').updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          items,
          coachId: req.user.id,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    res.json({ ok: true, saved: items.length });
  } catch (e) {
    console.error('ratings save error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// alias untuk kompatibilitas front-end yang mungkin pakai /performance
router.post('/sessions/:sessionId/performance', requireAuth('coach'), async (req, res, next) => {
  req.url = req.url.replace('/performance', '/ratings');
  next();
}, router);

// read-back
router.get('/sessions/:sessionId/ratings', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    const doc = await db.collection('ratings').findOne({ sessionId });
    res.json(doc || { sessionId, items: [] });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// ---- Daily summary (dipakai Home) -------------------------------
router.get('/sessions/daily', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId('today');
    const db = await getDb();
    const att = await db.collection('attendance').findOne({ sessionId });
    const rat = await db.collection('ratings').findOne({ sessionId });

    let attendance = '-';
    if (att && Array.isArray(att.items)) {
      const present = att.items.filter(x => x.status === 'present').length;
      attendance = `${present} / ${att.items.length}`;
    }

    const avgRating = rat && Array.isArray(rat.items) && rat.items.length
      ? (rat.items.reduce((s, x) => s + (x.rating || 0), 0) / rat.items.length).toFixed(1)
      : '-';

    res.json({
      sessionId: 'today',
      date: new Date().toISOString().slice(0, 10),
      attendance,
      focus: '-',            // bisa isi dari koleksi lain nanti
      notes: '-',            // idem
      risk: '-',             // idem
      avgRating
    });
  } catch (e) {
    console.error('daily error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ---- Recap (dipakai /recap) ------------------------------------
router.get('/sessions/:sessionId/recap', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    const att = await db.collection('attendance').findOne({ sessionId });
    const rat = await db.collection('ratings').findOne({ sessionId });

    const presentNames = (att?.items || []).filter(x => x.status === 'present').map(x => x.number);
    const absentNames  = (att?.items || []).filter(x => x.status === 'absent').map(x => x.number);

    res.json({
      sessionId,
      date: new Date().toISOString().slice(0,10),
      attendance: {
        present: presentNames,
        absent: absentNames
      },
      ratings: (rat?.items || []).map(x => ({ number: x.number, rating: x.rating, notes: x.notes || '' }))
    });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
