const mongoose = require('mongoose');

const DrillSchema = new mongoose.Schema({
  name: { type: String, required: true },        // contoh: "First touch under pressure"
  focus: { type: String, enum: ['technique', 'physical', 'mental'], required: true },
  score: { type: Number, min: 1, max: 10, required: true },
  coachNote: { type: String, default: "" },
  videoUrl: { type: String, default: "" }        // link ke video latihan hari itu
}, { _id: false });

const DailySessionSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },

  date: { type: String, required: true }, // format "YYYY-MM-DD"

  attendance: {
    type: String,
    enum: ['on-time', 'late', 'absent'],
    required: true
  },

  drills: { type: [DrillSchema], default: [] },

  injuryFlag: { type: Boolean, default: false },
  injuryNote: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailySession', DailySessionSchema);
