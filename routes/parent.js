const express = require('express');
const router = express.Router();

const Player = require('../models/Player');
const User = require('../models/User');
const { authRequired } = require('../middleware/authMiddleware');

// PART 4: GET /parent/overview
// Returns overview for a parent's child
router.get('/parent/overview', authRequired(['parent']), async (req, res) => {
  try {
    // Get the parent user's linked player
    const user = await User.findById(req.user.id);
    
    if (!user || !user.athleteId) {
      return res.status(404).json({
        error: 'no_linked_player',
        message: 'No player linked to this parent account'
      });
    }
    
    const player = await Player.findById(user.athleteId);
    
    if (!player) {
      return res.status(404).json({
        error: 'player_not_found',
        message: 'Linked player not found'
      });
    }
    
    // For MVP, return demo recent sessions data
    const recentSessions = [
      {
        sessionId: 'today',
        date: new Date().toISOString().split('T')[0],
        attendanceStatus: 'present',
        rating: 4,
        coachNotes: 'Strong finishing, high work rate',
        riskFlag: 'monitor ankle'
      },
      {
        sessionId: '2025-10-26-AM',
        date: '2025-10-26',
        attendanceStatus: 'present',
        rating: 4,
        coachNotes: 'Good performance overall',
        riskFlag: ''
      },
      {
        sessionId: '2025-10-25-AM',
        date: '2025-10-25',
        attendanceStatus: 'excused',
        rating: 0,
        coachNotes: 'Missed due to school exam',
        riskFlag: ''
      },
      {
        sessionId: '2025-10-24-AM',
        date: '2025-10-24',
        attendanceStatus: 'present',
        rating: 3,
        coachNotes: 'Needs more focus on positioning',
        riskFlag: ''
      },
      {
        sessionId: '2025-10-23-AM',
        date: '2025-10-23',
        attendanceStatus: 'present',
        rating: 5,
        coachNotes: 'Excellent session, great improvement',
        riskFlag: ''
      }
    ];
    
    res.json({
      player: {
        id: player._id.toString(),
        number: player.number || 0,
        name: player.name,
        position: player.positionOrStyle || ''
      },
      recentSessions: recentSessions
    });
  } catch (err) {
    console.error('get parent overview error', err);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to fetch parent overview'
    });
  }
});

module.exports = router;
