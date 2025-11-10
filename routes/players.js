// routes/players.js
const express = require('express');
const router = express.Router();

const Player = require('../models/Player');

// >>> ini yang benar:
const { authRequired } = require('../middleware/authMiddleware');

// contoh endpoint
router.post('/players', authRequired(['coach','admin']), async (req, res) => {
  try {
    const { number, name, position } = req.body;
    if (!number || !name) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const doc = await Player.findOneAndUpdate(
      { number },
      { $set: { number, name, position, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (e) {
    console.error('players upsert error', e);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
