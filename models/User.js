const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  role: {
    type: String,
    enum: ['coach', 'parent', 'athlete', 'admin'],
    required: true
  },

  // kalau parent atau athlete, kita bisa link ke playerId
  athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);