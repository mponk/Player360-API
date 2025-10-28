const express = require('express');
const router = express.Router();

const WellnessCheck = require('../models/WellnessCheck');
const { authRequired } = require('../middleware/authMiddleware');

// CREATE wellness check
// POST /wellness
//
// body contoh:
// {
//   "playerId": "PLAYER_MONGO_ID",
//   "weekStartDate": "2025-10-27",
//   "weightKg": 34.2,
//   "heightCm": 143,
//   "sleepHoursAvg": 8,
//   "energyLevel": 4,
//   "hydrationOk": true,
//   "appetite": "normal",
//   "sorenessNote": "hamstring agak tight",
//   "parentAction": "please stretching ringan sebelum tidur",
//   "coachAlert": "kurangi sprint setinggi full speed minggu depan"
// }
router.post('/wellness', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const {
      playerId,
      weekStartDate,
      weightKg,
      heightCm,
      sleepHoursAvg,
      energyLevel,
      hydrationOk,
      appetite,
      sorenessNote,
      parentAction,
      coachAlert
    } = req.body;

    if (!playerId || !weekStartDate) {
      return res.status(400).json({ error: 'playerId and weekStartDate are required' });
    }

    const check = await WellnessCheck.create({
      playerId,
      weekStartDate,
      weightKg: weightKg ?? null,
      heightCm: heightCm ?? null,
      sleepHoursAvg: sleepHoursAvg ?? null,
      energyLevel: energyLevel ?? null,
      hydrationOk: hydrationOk ?? true,
      appetite: appetite || "",
      sorenessNote: sorenessNote || "",
      parentAction: parentAction || "",
      coachAlert: coachAlert || ""
    });

    res.json(check);
  } catch (err) {
    console.error('create wellness check error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET wellness check(s)
// GET /wellness?playerId=...&weekStartDate=YYYY-MM-DD
router.get('/wellness', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { playerId, weekStartDate } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const query = { playerId };
    if (weekStartDate) {
      query.weekStartDate = weekStartDate;
    }

    const checks = await WellnessCheck.find(query).sort({ createdAt: -1 });

    res.json(checks);
  } catch (err) {
    console.error('get wellness check error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
