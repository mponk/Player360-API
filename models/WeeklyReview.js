const mongoose = require('mongoose');

const HighlightVideoSchema = new mongoose.Schema({
  label: { type: String, required: true },         // contoh: "1v1 left foot finish"
  videoUrl: { type: String, default: "" },
  coachComment: { type: String, default: "" }
}, { _id: false });

const WeeklyReviewSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },

  weekStartDate: { type: String, required: true }, // "YYYY-MM-DD" (misal Senin minggu tsb)

  techniqueScore: { type: Number, min: 1, max: 10, required: true },
  physicalScore: { type: Number, min: 1, max: 10, required: true },
  mentalScore: { type: Number, min: 1, max: 10, required: true },

  attendanceRate: { type: Number, min: 0, max: 100, required: true },

  coachNote: { type: String, default: "" },

  highlightVideos: { type: [HighlightVideoSchema], default: [] },

  systemRecommendation: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WeeklyReview', WeeklyReviewSchema);
