// routes/sessions.store.js
const express = require('express');
const router = express.Router();
const { requireCoach } = require('../middleware/authMiddleware');

// gunakan Mongo driver via mongoose koneksi default
const mongoose = require('mongoose');
const getDb = () => mongoose.connection.db;

// helper sessionId
function resolveSessionId(id = 'today') {
  if (!id || id === 'today') {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return id;
}

/**
 * POST /sessions/today/attendance
 * body: Array<{ number: Number, status: 'present'|'absent'|'excused' }>
 */
router.post('/sessions/today/attendance', requireCoach, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : null;
    if (!items) return res.status(400).json({ error: 'invalid_data', message: 'Body must be an array' });

    const db = getDb();
    const sessionId = resolveSessionId('today');

    await db.collection('attendance').updateOne(
      { sessionId, coachId: req.user.id },
      { $set: { sessionId, coachId: req.user.id, items, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true, saved: items.length });
  } catch (e) {
    console.error('save attendance error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /sessions/today/attendance
 */
router.get('/sessions/today/attendance', requireCoach, async (req, res) => {
  try {
    const db = getDb();
    const sessionId = resolveSessionId('today');
    const doc = await db.collection('attendance').findOne({ sessionId, coachId: req.user.id });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (e) {
    console.error('get attendance error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /sessions/today/ratings
 * body: Array<{ number: Number, rating: Number, notes?: String }>
 */
router.post('/sessions/today/ratings', requireCoach, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : null;
    if (!items) return res.status(400).json({ error: 'invalid_data', message: 'Body must be an array' });

    const db = getDb();
    const sessionId = resolveSessionId('today');

    await db.collection('ratings').updateOne(
      { sessionId, coachId: req.user.id },
      { $set: { sessionId, coachId: req.user.id, items, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true, saved: items.length });
  } catch (e) {
    console.error('save ratings error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /sessions/today/ratings
 */
router.get('/sessions/today/ratings', requireCoach, async (req, res) => {
  try {
    const db = getDb();
    const sessionId = resolveSessionId('today');
    const doc = await db.collection('ratings').findOne({ sessionId, coachId: req.user.id });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (e) {
    console.error('get ratings error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /sessions/daily  → ringkasan untuk dashboard
 */
router.get('/sessions/daily', requireCoach, async (req, res) => {
  try {
    const db = getDb();
    const sessionId = resolveSessionId('today');
    const att = await db.collection('attendance').findOne({ sessionId, coachId: req.user.id });
    const rat = await db.collection('ratings').findOne({ sessionId, coachId: req.user.id });

    let present = 0, total = 0, avgRating = null;
    if (att && Array.isArray(att.items)) {
      total = att.items.length;
      present = att.items.filter(i => i.status === 'present').length;
    }
    if (rat && Array.isArray(rat.items) && rat.items.length) {
      const sum = rat.items.reduce((s, x) => s + (Number(x.rating) || 0), 0);
      avgRating = +(sum / rat.items.length).toFixed(1);
    }

    res.json({
      sessionId: 'today',
      date: sessionId,
      attendance: total ? `${present} / ${total}` : '-',
      attendanceObj: { present, total, text: total ? `${present} / ${total}` : '-' },
      focus: '-',
      notes: '-',
      risk: '-',
      avgRating: avgRating ?? '-',
    });
  } catch (e) {
    console.error('daily error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /sessions/today/recap → view recap
 */
router.get('/sessions/today/recap', requireCoach, async (req, res) => {
  try {
    const db = getDb();
    const sessionId = resolveSessionId('today');
    const att = await db.collection('attendance').findOne({ sessionId, coachId: req.user.id });
    const rat = await db.collection('ratings').findOne({ sessionId, coachId: req.user.id });

    const present = (att?.items || []).filter(i => i.status === 'present').map(i => i.number);
    const absent  = (att?.items || []).filter(i => i.status === 'absent').map(i => i.number);

    const ratings = (rat?.items || []).map(x => ({
      number: x.number, rating: x.rating, notes: x.notes || ''
    }));

    const highlight = ratings
      .filter(x => x.rating >= 4)
      .map(x => `#${x.number} rating ${x.rating}${x.notes ? ` — ${x.notes}` : ''}`);

    const concern = ratings
      .filter(x => x.rating <= 2 || /cedera|injury|lelah|sakit|lemes/i.test(x.notes || ''))
      .map(x => `#${x.number}${x.notes ? ` — ${x.notes}` : ''}`);

    res.json({
      sessionId: 'today',
      date: sessionId,
      attendance: { present, absent },
      ratings,
      highlight,
      concern,
      notes: '-',
    });
  } catch (e) {
    console.error('recap error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
