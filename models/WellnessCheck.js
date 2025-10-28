const mongoose = require('mongoose');

const WellnessCheckSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },

  weekStartDate: { type: String, required: true }, // "YYYY-MM-DD"

  weightKg: { type: Number, required: false },     // berat badan anak
  heightCm: { type: Number, required: false },     // tinggi badan

  sleepHoursAvg: { type: Number, required: false },    // rata2 jam tidur per malam
  energyLevel: { type: Number, min: 1, max: 5, required: false }, // 1-5

  hydrationOk: { type: Boolean, default: true },   // minum cukup?
  appetite: { type: String, default: "" },         // normal / low / high

  sorenessNote: { type: String, default: "" },     // "paha kanan ketarik dikit"
  parentAction: { type: String, default: "" },     // "tolong kasih makanan protein abis latihan sore"
  coachAlert: { type: String, default: "" },       // "kurangi sprint minggu depan"

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WellnessCheck', WellnessCheckSchema);
