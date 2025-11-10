// routes/sessions.store.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authRequired } = require('../middleware/authMiddleware'); // <- PENTING: path & export

const col = (name) => mongoose.connection.collection(name);
const todayId = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// --- ATTENDANCE ---
// Save today's attendance (array of { number, status })
router.post('/sessions/today/attendance', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'invalid_data', message: 'Body must be an array' });
    }
    const sessionId = todayId();
    const doc = {
      sessionId,
      coachId: req.user.id,
      items: items.map(x => ({ number: +x.number, status: String(x.status || '').toLowerCase() })),
      updatedAt: new Date(),
      createdAt: new Date()
    };
    await col('attendance').updateOne(
      { sessionId, coachId: req.user.id },
      { $set: { items: doc.items, updatedAt: doc.updatedAt }, $setOnInsert: { createdAt: doc.createdAt } },
      { upsert: true }
    );
    return res.json({ ok: true, saved: doc.items.length });
  } catch (e) {
    console.error('attendance save err', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Get today's attendance
router.get('/sessions/today/attendance', authRequired(['coach', 'admin']), async (req, res) => {
  const sessionId = todayId();
  const data = await col('attendance').findOne({ sessionId, coachId: req.user.id });
  if (!data) return res.status(404).json({ error: 'not_found' });
  return res.json(data);
});

// --- RATINGS ---
// Save today's ratings (array of { number, rating, notes? })
router.post('/sessions/today/ratings', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'invalid_data', message: 'Body must be an array' });
    }
    const sessionId = todayId();
    const norm = items.map(x => ({
      number: +x.number,
      rating: Math.max(1, Math.min(5, +x.rating || 0)),
      notes: String(x.notes || '')
    }));
    await col('ratings').updateOne(
      { sessionId, coachId: req.user.id },
      { $set: { items: norm, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return res.json({ ok: true, saved: norm.length });
  } catch (e) {
    console.error('ratings save err', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Get today's ratings
router.get('/sessions/today/ratings', authRequired(['coach', 'admin']), async (req, res) => {
  const sessionId = todayId();
  const data = await col('ratings').findOne({ sessionId, coachId: req.user.id });
  if (!data) return res.status(404).json({ error: 'not_found' });
  return res.json(data);
});

// --- DAILY SUMMARY (home cards) ---
router.get('/sessions/daily', authRequired(['coach', 'admin']), async (req, res) => {
  const sessionId = todayId();
  const [A, R] = await Promise.all([
    col('attendance').findOne({ sessionId, coachId: req.user.id }),
    col('ratings').findOne({ sessionId, coachId: req.user.id })
  ]);

  const present = A ? A.items.filter(x => x.status === 'present').length : 0;
  const total = A ? A.items.length : 0;
  const avg = R && R.items.length
    ? +(R.items.reduce((s, x) => s + (+x.rating || 0), 0) / R.items.length).toFixed(1)
    : null;

  return res.json({
    sessionId: 'today',
    date: sessionId,
    attendance: total ? `${present} / ${total}` : '-',
    attendanceObj: total ? { present, total, text: `${present} / ${total}` } : undefined,
    focus: '-',
    notes: '-',
    risk: '-',
    avgRating: avg
  });
});

// --- RECAP PAGE ---
router.get('/sessions/today/recap', authRequired(['coach', 'admin']), async (req, res) => {
  const sessionId = todayId();
  const [A, R] = await Promise.all([
    col('attendance').findOne({ sessionId, coachId: req.user.id }),
    col('ratings').findOne({ sessionId, coachId: req.user.id })
  ]);

  const present = (A?.items || []).filter(x => x.status === 'present').map(x => x.number);
  const absent  = (A?.items || []).filter(x => x.status === 'absent').map(x => x.number);

  const ratings = (R?.items || []).map(x => ({ number: x.number, rating: +x.rating || 0, notes: x.notes || '' }));
  const highlight = ratings
    .filter(x => x.rating >= 4)
    .map(x => `#${x.number} rating ${x.rating}${x.notes ? ` — ${x.notes}` : ''}`);
  const concern = ratings
    .filter(x => x.rating <= 2 || (x.notes && /injur|ceder|hamstring|ankle|tight/i.test(x.notes)))
    .map(x => `#${x.number}${x.notes ? ` — ${x.notes}` : ''}`);

  return res.json({
    sessionId: 'today',
    date: sessionId,
    attendance: { present, absent },
    ratings,
    highlight,
    concern,
    notes: '-'
  });
});

module.exports = router;
