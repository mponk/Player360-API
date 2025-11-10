// routes/sessions.persist.js
const express = require('express');
const router = express.Router();

const TODAY = 'today';

// helper auth: kalau middleware auth kamu sudah set req.user, ini cukup
const needLogin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
};
const needCoach = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  if (req.user.role !== 'coach') return res.status(403).json({ error: 'forbidden' });
  next();
};

// --- Normalisasi payload ---
function normalizeAttendanceBody(body) {
  // dukung {items:[{number,status}]} atau {attendance:[...]} atau {attendance:{'4':'present',...}}
  let rows = body?.items ?? body?.attendance ?? null;
  if (!rows) return null;

  if (Array.isArray(rows)) {
    return rows.map(x => ({
      playerId: x.playerId ?? null,
      number: x.number ?? null,
      status: String(x.status || '').toLowerCase()
    }));
  }
  if (rows && typeof rows === 'object') {
    // bentuk map { "4":"present", ... }
    return Object.entries(rows).map(([k, v]) => ({
      playerId: null,
      number: Number(k),
      status: String(v || '').toLowerCase()
    }));
  }
  return null;
}

function normalizePerformanceBody(body) {
  // dukung {items:[{number,rating,notes}]} atau {performance:[...]}
  const rows = body?.items ?? body?.performance ?? null;
  if (!Array.isArray(rows)) return null;
  return rows.map(x => ({
    playerId: x.playerId ?? null,
    number: x.number ?? null,
    rating: Number(x.rating) || 0,
    notes: (x.notes || '').toString()
  }));
}

// --- Attendance: simpan & ambil ---
router.post('/sessions/today/attendance', needCoach, async (req, res) => {
  try {
    const items = normalizeAttendanceBody(req.body);
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'invalid_data', message: 'Attendance must be an array' });
    }
    await req.db.collection('attendance').updateOne(
      { sessionId: TODAY },
      { $set: { sessionId: TODAY, items, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('attendance save error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/sessions/today/attendance', needLogin, async (req, res) => {
  try {
    const doc = await req.db.collection('attendance').findOne({ sessionId: TODAY });
    res.json(doc || { sessionId: TODAY, items: [] });
  } catch (e) {
    console.error('attendance get error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// --- Performance: simpan & ambil ---
router.post('/sessions/today/performance', needCoach, async (req, res) => {
  try {
    const items = normalizePerformanceBody(req.body);
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'invalid_data', message: 'Performance must be an array' });
    }
    await req.db.collection('ratings').updateOne(
      { sessionId: TODAY },
      { $set: { sessionId: TODAY, items, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('performance save error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/sessions/today/ratings', needLogin, async (req, res) => {
  try {
    const doc = await req.db.collection('ratings').findOne({ sessionId: TODAY });
    res.json(doc || { sessionId: TODAY, items: [] });
  } catch (e) {
    console.error('ratings get error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// --- Ringkasan harian (dashboard & recap) ---
const asDateYMD = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

async function buildDailySummary(db) {
  const [att, rat] = await Promise.all([
    db.collection('attendance').findOne({ sessionId: TODAY }),
    db.collection('ratings').findOne({ sessionId: TODAY })
  ]);

  const itemsA = att?.items || [];
  const present = itemsA.filter(i => i.status === 'present').length;
  const excused = itemsA.filter(i => i.status === 'excused').length;
  const absent  = itemsA.filter(i => i.status === 'absent').length;
  const total   = itemsA.length;

  const itemsR = rat?.items || [];
  const rated  = itemsR.filter(i => Number(i.rating) > 0);
  const sorted = [...rated].sort((a, b) => Number(b.rating) - Number(a.rating));
  const tops   = sorted.slice(0, 2);
  const lows   = sorted.slice(-2);

  const highlight = tops.map(t => `${t.number ? `#${t.number}` : (t.playerId||'player')} — rating ${t.rating}${t.notes ? ` (${t.notes.slice(0,60)})` : ''}`);
  const concern   = lows.map(t => `${t.number ? `#${t.number}` : (t.playerId||'player')} — rating ${t.rating}${t.notes ? ` (${t.notes.slice(0,60)})` : ''}`);

  return {
    sessionId: TODAY,
    date: asDateYMD(),
    attendance: total ? `${present} / ${total}` : '-',
    focus: '-',
    notes: '-',
    risk: total ? `${excused} excused, ${absent} absent` : '-',
    highlight, concern
  };
}

router.get('/sessions/daily', needLogin, async (req, res) => {
  try { res.json(await buildDailySummary(req.db)); }
  catch (e) { console.error('daily error', e); res.status(500).json({ error: 'server_error' }); }
});

router.get('/sessions/today/recap', needLogin, async (req, res) => {
  try {
    const s = await buildDailySummary(req.db);
    res.json({ sessionId: s.sessionId, date: s.date, highlight: s.highlight, concern: s.concern, notes: s.notes });
  } catch (e) {
    console.error('recap error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
