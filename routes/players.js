const express = require('express');
const router = express.Router();

const Player = require('../models/Player');
const { authRequired } = require('../middleware/authMiddleware');

// CREATE PLAYER
// body:
// {
//   "name": "Kamajaya Vishnu",
//   "sport": "football",
//   "birthdate": "2012-04-19",
//   "positionOrStyle": "Striker",
//   "notes": "Left foot dominant, strong acceleration"
// }
router.post('/players', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { name, sport, birthdate, positionOrStyle, notes } = req.body;

    if (!name || !sport || !birthdate) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const player = await Player.create({
      name,
      sport,
      birthdate,
      positionOrStyle: positionOrStyle || "",
      notes: notes || ""
    });

    res.json(player);
  } catch (err) {
    console.error('create player error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LIST ALL PLAYERS
router.get('/players', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    console.error('list players error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ONE PLAYER
router.get('/players/:id', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Not found' });
    res.json(player);
  } catch (err) {
    console.error('get player error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
