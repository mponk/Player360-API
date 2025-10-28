const express = require('express');
const router = express.Router();

const WeeklyReview = require('../models/WeeklyReview');
const { authRequired } = require('../middleware/authMiddleware');

function buildRecommendation(techniqueScore, physicalScore, mentalScore) {
  const recs = [];

  if (techniqueScore < 7) {
    recs.push("Latihan teknik individu 10 menit/hari (kaki lemah, first touch, kontrol bola).");
  }
  if (physicalScore < 7) {
    recs.push("Tambahkan basic strength/core ringan di rumah 5 menit tiap pagi.");
  }
  if (mentalScore < 7) {
    recs.push("Latihan fokus dan ketenangan: sebelum latihan tarik napas 2 menit, visualisasi keberhasilan.");
  }
  if (recs.length === 0) {
    recs.push("Pertahankan konsistensi minggu depan. Fokus di kualitas, bukan hanya kuantitas.");
  }

  return recs.join(" ");
}

// CREATE weekly review
// POST /reviews/weekly
//
// body contoh:
// {
//   "playerId": "PLAYER_MONGO_ID",
//   "weekStartDate": "2025-10-27",
//   "techniqueScore": 7,
//   "physicalScore": 8,
//   "mentalScore": 6,
//   "attendanceRate": 90,
//   "coachNote": "Mulai berani duel 1v1. Butuh lebih percaya diri di komunikasi tim.",
//   "highlightVideos": [
//     {
//       "label": "1v1 left foot finish",
//       "videoUrl": "https://youtu.be/clip1",
//       "coachComment": "Dia mulai pakai kaki lemah"
//     }
//   ]
// }
router.post('/reviews/weekly', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const {
      playerId,
      weekStartDate,
      techniqueScore,
      physicalScore,
      mentalScore,
      attendanceRate,
      coachNote,
      highlightVideos
    } = req.body;

    if (!playerId || !weekStartDate ||
        techniqueScore === undefined ||
        physicalScore === undefined ||
        mentalScore === undefined ||
        attendanceRate === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const systemRecommendation = buildRecommendation(
      techniqueScore,
      physicalScore,
      mentalScore
    );

    const review = await WeeklyReview.create({
      playerId,
      weekStartDate,
      techniqueScore,
      physicalScore,
      mentalScore,
      attendanceRate,
      coachNote: coachNote || "",
      highlightVideos: highlightVideos || [],
      systemRecommendation
    });

    res.json(review);
  } catch (err) {
    console.error('create weekly review error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET weekly reviews for a player (optionally filter by weekStartDate)
// GET /reviews/weekly?playerId=...&weekStartDate=YYYY-MM-DD
router.get('/reviews/weekly', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { playerId, weekStartDate } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const query = { playerId };

    if (weekStartDate) {
      query.weekStartDate = weekStartDate;
    }

    const reviews = await WeeklyReview.find(query).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error('get weekly reviews error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
