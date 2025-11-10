// routes/sessions.store.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

const router = express.Router();

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
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

function normalizeItems(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.items)) return body.items;
  return null;
}
function normalizeSessionId(sid) {
  if (!sid || sid === 'today') return new Date().toISOString().slice(0, 10);
  return sid;
}

/* ---------------------- Attendance ---------------------- */
router.post('/sessions/:sessionId/attendance', requireAuth('coach'), async (req, res) => {
  try {
    const items = normalizeItems(req.body);
    if (!items) return res.status(400).json({ error: 'invalid_data', message: 'Attendance must be an array' });
    const allowed = new Set(['present', 'excused', 'absent']);
    for (const it of items) {
      if (typeof it.number !== 'number' || !allowed.has(String(it.status).toLowerCase())) {
        return res.status(400).json({ error: 'invalid_data', message: 'Invalid number/status' });
      }
      it.status = String(it.status).toLowerCase();
    }
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    await db.collection('attendance').updateOne(
      { sessionId },
      { $set: { sessionId, items, coachId: req.user.id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
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
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------------------- Ratings ------------------------- */
router.post('/sessions/:sessionId/ratings', requireAuth('coach'), async (req, res) => {
  try {
    const items = normalizeItems(req.body);
    if (!items) return res.status(400).json({ error: 'invalid_data', message: 'Ratings must be an array' });
    for (const it of items) {
      if (typeof it.number !== 'number' || typeof it.rating !== 'number' || it.rating < 1 || it.rating > 5) {
        return res.status(400).json({ error: 'invalid_data', message: 'Rating must be 1..5 with player number' });
      }
    }
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    await db.collection('ratings').updateOne(
      { sessionId },
      { $set: { sessionId, items, coachId: req.user.id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, saved: items.length });
  } catch (e) {
    console.error('ratings save error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// kompatibilitas /performance
router.post('/sessions/:sessionId/performance', requireAuth('coach'), async (req, res, next) => {
  req.url = req.url.replace('/performance', '/ratings');
  next();
}, router);

router.get('/sessions/:sessionId/ratings', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    const doc = await db.collection('ratings').findOne({ sessionId });
    res.json(doc || { sessionId, items: [] });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------------------- Daily (Home) -------------------- */
router.get('/sessions/daily', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId('today');
    const db = await getDb();
    const att = await db.collection('attendance').findOne({ sessionId });
    const rat = await db.collection('ratings').findOne({ sessionId });

    const total = att?.items?.length || 0;
    const present = att?.items?.filter(x => x.status === 'present').length || 0;

    const avgRating = rat && Array.isArray(rat.items) && rat.items.length
      ? Number((rat.items.reduce((s, x) => s + (x.rating || 0), 0) / rat.items.length).toFixed(1))
      : null;

    res.json({
      sessionId: 'today',
      date: new Date().toISOString().slice(0, 10),

      // bentuk string + numerik (biar FE mana pun bisa render)
      attendance: {
        text: total ? `${present} / ${total}` : '-',
        present,
        total
      },

      focus: '-',     // (bisa diisi dari koleksi lain nanti)
      notes: '-',
      risk: '-',
      avgRating   // number atau null
    });
  } catch (e) {
    console.error('daily error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------------------- Recap -------------------------- */
router.get('/sessions/:sessionId/recap', requireAuth(['coach','parent']), async (req, res) => {
  try {
    const sessionId = normalizeSessionId(req.params.sessionId);
    const db = await getDb();
    const att = await db.collection('attendance').findOne({ sessionId });
    const rat = await db.collection('ratings').findOne({ sessionId });

    const present = (att?.items || []).filter(x => x.status === 'present').map(x => x.number);
    const absent  = (att?.items || []).filter(x => x.status === 'absent').map(x => x.number);

    // highlight/concern sederhana dari rating & notes
    const highlight = [];
    const concern = [];
    for (const it of (rat?.items || [])) {
      if (it.rating >= 4) highlight.push(`#${it.number} rating ${it.rating}${it.notes ? ' — ' + it.notes : ''}`);
      if (it.notes && /cedera|injur|pain|fisik|lemes/i.test(it.notes)) {
        concern.push(`#${it.number} — ${it.notes}`);
      }
    }

    res.json({
      sessionId,
      date: new Date().toISOString().slice(0,10),
      attendance: { present, absent },
      ratings: (rat?.items || []).map(x => ({ number: x.number, rating: x.rating, notes: x.notes || '' })),
      highlight,
      concern,
      notes: '-'  // placeholder supaya FE yang expect 'notes' tetap aman
    });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
