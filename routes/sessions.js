const express = require('express');
const router = express.Router();

const Player = require('../models/Player');
const { authRequired } = require('../middleware/authMiddleware');

// In-memory store for session data (for MVP)
// In production, these would be stored in MongoDB
const sessionStore = {
  daily: {
    sessionId: 'today',
    date: new Date().toISOString().split('T')[0],
    focus: 'Finishing & First Touch',
    notes: 'Good intensity overall',
    risk: '2 players need recovery',
    highlight: [
      'Asep (FW) - excellent finishing',
      'Rafi (DF) - won ~80% aerial duels'
    ],
    concern: [
      'Bimo: pressing intensity still low',
      'Fajar: ankle tightness, monitor recovery'
    ],
    detailedRisk: [
      {
        playerId: 'p2',
        name: 'Fajar',
        issue: 'ankle tightness',
        status: 'monitor'
      },
      {
        playerId: 'p5',
        name: 'Rama',
        issue: 'hamstring load high',
        status: 'rest recommended'
      }
    ]
  },
  attendance: {}, // { sessionId: { playerId: status } }
  performance: {},  // { sessionId: { playerId: { rating, notes } } }
  attendanceAudit: {}, // { sessionId: { coachId, timestamp } }
  performanceAudit: {} // { sessionId: { coachId, timestamp } }
};

// GET /sessions/daily
// Returns today's session summary for dashboard
router.get('/sessions/daily', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const sessionId = 'today';
    
    // Count attendance
    const totalPlayers = await Player.countDocuments();
    const attendanceData = sessionStore.attendance[sessionId] || {};
    const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
    
    res.json({
      sessionId: sessionId,
      date: sessionStore.daily.date,
      attendance: `${presentCount} / ${totalPlayers}`,
      focus: sessionStore.daily.focus,
      notes: sessionStore.daily.notes,
      risk: sessionStore.daily.risk,
      highlight: sessionStore.daily.highlight,
      concern: sessionStore.daily.concern,
      detailedRisk: sessionStore.daily.detailedRisk
    });
  } catch (err) {
    console.error('get daily session error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to fetch daily session' 
    });
  }
});

// GET /sessions/:sessionId/players
// Returns list of all players with their attendance status
router.get('/sessions/:sessionId/players', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const players = await Player.find().sort({ number: 1 });
    const attendanceData = sessionStore.attendance[sessionId] || {};
    
    const result = players.map(p => ({
      id: p._id.toString(),
      number: p.number || 0,
      name: p.name,
      position: p.positionOrStyle || '',
      status: attendanceData[p._id.toString()] || 'present'
    }));
    
    res.json({ players: result });
  } catch (err) {
    console.error('get players error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to fetch players' 
    });
  }
});

// POST /sessions/:sessionId/attendance
// Saves attendance for a session
router.post('/sessions/:sessionId/attendance', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { attendance } = req.body;
    
    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ 
        error: 'invalid_data',
        message: 'Attendance must be an array' 
      });
    }
    
    // Store attendance data
    if (!sessionStore.attendance[sessionId]) {
      sessionStore.attendance[sessionId] = {};
    }
    
    attendance.forEach(({ id, status }) => {
      if (id && status) {
        sessionStore.attendance[sessionId][id] = status;
      }
    });
    
    // PART 1: Audit trail - store who saved and when
    sessionStore.attendanceAudit[sessionId] = {
      coachId: req.user.id,
      timestamp: Date.now()
    };
    
    res.json({ ok: true });
  } catch (err) {
    console.error('save attendance error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to save attendance' 
    });
  }
});

// GET /sessions/:sessionId/performance
// Returns player ratings for a session
router.get('/sessions/:sessionId/performance', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const players = await Player.find().sort({ number: 1 });
    const performanceData = sessionStore.performance[sessionId] || {};
    
    const result = players.map(p => ({
      id: p._id.toString(),
      number: p.number || 0,
      name: p.name,
      rating: performanceData[p._id.toString()]?.rating || 0,
      notes: performanceData[p._id.toString()]?.notes || ''
    }));
    
    res.json({ players: result });
  } catch (err) {
    console.error('get performance error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to fetch performance data' 
    });
  }
});

// POST /sessions/:sessionId/performance
// Saves player ratings for a session
router.post('/sessions/:sessionId/performance', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { ratings } = req.body;
    
    if (!ratings || !Array.isArray(ratings)) {
      return res.status(400).json({ 
        error: 'invalid_data',
        message: 'Ratings must be an array' 
      });
    }
    
    // Store performance data
    if (!sessionStore.performance[sessionId]) {
      sessionStore.performance[sessionId] = {};
    }
    
    ratings.forEach(({ id, rating, notes }) => {
      if (id && rating !== undefined) {
        sessionStore.performance[sessionId][id] = {
          rating: Number(rating),
          notes: notes || ''
        };
      }
    });
    
    // PART 1: Audit trail - store who saved and when
    sessionStore.performanceAudit[sessionId] = {
      coachId: req.user.id,
      timestamp: Date.now()
    };
    
    res.json({ ok: true });
  } catch (err) {
    console.error('save performance error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to save performance data' 
    });
  }
});

// PART 2: GET /sessions/:sessionId/recap
// Returns recap data for a specific session
router.get('/sessions/:sessionId/recap', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // For now, return the same data for all sessions (MVP demo)
    res.json({
      sessionId: sessionId,
      date: sessionStore.daily.date,
      highlight: sessionStore.daily.highlight,
      concern: sessionStore.daily.concern,
      notes: sessionStore.daily.notes,
      detailedRisk: sessionStore.daily.detailedRisk
    });
  } catch (err) {
    console.error('get recap error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to fetch recap' 
    });
  }
});

// PART 5: GET /sessions/weekly-review
// Returns weekly review for coach
router.get('/sessions/weekly-review', authRequired(['coach', 'admin']), async (req, res) => {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    
    // For MVP, return demo data
    res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: today.toISOString().split('T')[0],
      topPerformers: [
        { name: 'Asep', number: 7, avgRating: 4.6, note: 'Finishing and work rate' },
        { name: 'Rafi', number: 4, avgRating: 4.4, note: 'Won ~80% aerial duels' }
      ],
      attendanceSummary: {
        sessionsHeld: 5,
        attendanceRate: '88%'
      },
      riskAlerts: [
        { name: 'Fajar', issue: 'ankle tightness', status: 'monitor' },
        { name: 'Rama', issue: 'hamstring load high', status: 'rest recommended' }
      ],
      focusNotes: 'This week\'s tactical focus: pressing in first 5 seconds after loss.'
    });
  } catch (err) {
    console.error('get weekly review error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to fetch weekly review' 
    });
  }
});

module.exports = router;
