const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },

  number: { type: Number, default: 0 },
  // jersey number

  sport: { type: String, enum: ['football', 'wushu', 'other'], required: true },

  birthdate: { type: Date, required: true },

  positionOrStyle: { type: String, default: "" },
  // example: "Striker", "Center Back", "Chang Quan", "Taolu"

  notes: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', PlayerSchema);
