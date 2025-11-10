// routes/sessions.store.js
// Route "nyata" untuk menyimpan & membaca attendance/ratings + ringkasan harian.
// Bergantung pada: auth middleware (auth / authAny), dan req.db (Mongo) dari middleware koneksi.

const express = require('express');
const router = express.Router();

// Helper: izinkan siapa saja yg sudah login (coach/parent)
const authAny = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
};

// Kalau project kamu sudah punya "auth(role)" => pakai ini:
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
  next();
};

// Normalisasikan "today" sebagai sessionId fix (sesuai FE sekarang)
const TODAY = 'today';

// ------ POST: Attendance ------
router.post('/sessions/today/attendance', requireRole('coach'), async (req, res) => {
  try {
    const { items } = req.body; // [{playerId?, number?, status:'present'|'excused'|'absent'}]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'bad_request' });

    const col = req.db.collection('attendance');
    await col.updateOne(
      { sessionId: TODAY },
      {
        $set: {
          sessionId: TODAY,
          items: items.map(x => ({
            playerId: x.playerId ?? null,
            number: x.number ?? null,
            status: String(x.status || '').toLowerCase(), // present/excused/absent
          })),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /sessions/today/attendance error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ------ POST: Performance (ratings) ------
router.post('/sessions/today/performance', requireRole('coach'), async (req, res) => {
  try {
    const { items } = req.body; // [{playerId?, number?, rating:1..5, notes?:string}]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'bad_request' });

    const col = req.db.collection('ratings');
    await col.updateOne(
      { sessionId: TODAY },
      {
        $set: {
          sessionId: TODAY,
          items: items.map(x => ({
            playerId: x.playerId ?? null,
            number: x.number ?? null,
            rating: Number(x.rating) || 0,
            notes: (x.notes || '').toString(),
          })),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /sessions/today/performance error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ------ (Opsional, buat debug & kompatibilitas FE) GET raw data ------
router.get('/sessions/today/attendance', authAny, async (req, res) => {
  try {
    const doc = await req.db.collection('attendance').findOne({ sessionId: TODAY });
    res.json(doc || { sessionId: TODAY, items: [] });
  } catch (e) {
    console.error('GET attendance error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/sessions/today/ratings', authAny, async (req, res) => {
  try {
    const doc = await req.db.collection('ratings').findOne({ sessionId: TODAY });
    res.json(doc || { sessionId: TODAY, items: [] });
  } catch (e) {
    console.error('GET ratings error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ------ Ringkasan harian dari Mongo (ganti stub) ------
// Util kecil
const asDateYMD = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);

async function buildDailySummary(db) {
  const [att, rat] = await Promise.all([
    db.collection('attendance').findOne({ sessionId: TODAY }),
    db.collection('ratings').findOne({ sessionId: TODAY }),
  ]);

  // Attendance
  const itemsA = att?.items || [];
  const present = itemsA.filter(i => i.status === 'present').length;
  const excused = itemsA.filter(i => i.status === 'excused').length;
  const absent  = itemsA.filter(i => i.status === 'absent').length;
  const total   = itemsA.length || 0;

  // Ratings
  const itemsR = rat?.items || [];
  const rated  = itemsR.filter(i => Number(i.rating) > 0);
  const avg    = rated.length
    ? (rated.reduce((s, i) => s + Number(i.rating || 0), 0) / rated.length).toFixed(2)
    : null;

  // Highlight top 2, concern bottom 2 (berdasarkan rating); fallback dari notes
  const sorted = [...rated].sort((a,b) => Number(b.rating)-Number(a.rating));
  const tops   = sorted.slice(0,2);
  const lows   = sorted.slice(-2);

  const highlight = tops.map(t => {
    const num = t.number ? `#${t.number}` : (t.playerId || 'player');
    return `${num} — rating ${t.rating}${t.notes?` (${t.notes.slice(0,60)})`:''}`;
  });

  const concern = lows.map(t => {
    const num = t.number ? `#${t.number}` : (t.playerId || 'player');
    return `${num} — rating ${t.rating}${t.notes?` (${t.notes.slice(0,60)})`:''}`;
  });

  return {
    sessionId: TODAY,
    date: asDateYMD(),
    attendance: total ? `${present} / ${total}` : '-',
    focus: '-', // FE belum ada form fokus; bisa ditambah nanti
    notes: '-', // idem
    risk: excused || absent ? `${excused} excused, ${absent} absent` : '-',
    highlight,
    concern,
  };
}

router.get('/sessions/daily', authAny, async (req, res) => {
  try {
    const summary = await buildDailySummary(req.db);
    res.json(summary);
  } catch (e) {
    console.error('GET daily error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/sessions/today/recap', authAny, async (req, res) => {
  try {
    const sum = await buildDailySummary(req.db);
    // Recap versi ringkas
    res.json({
      sessionId: sum.sessionId,
      date: sum.date,
      highlight: sum.highlight,
      concern: sum.concern,
      notes: sum.notes,
    });
  } catch (e) {
    console.error('GET recap error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;