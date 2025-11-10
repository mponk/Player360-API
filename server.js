require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// NEW: persistent sessions storage routes (must be mounted first)
const sessionsStoreRoute = require('./routes/sessions.store');

// API route modules
const healthRoute   = require('./routes/health');
const authRoute     = require('./routes/auth');
const playersRoute  = require('./routes/players');
const sessionsRoute = require('./routes/sessions');   // legacy/fallback
const reviewsRoute  = require('./routes/reviews');
const wellnessRoute = require('./routes/wellness');
const parentRoute   = require('./routes/parent');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Serve static frontend (if present in this container)
app.use(express.static(path.join(__dirname, 'public')));

// --- API routes ---
// IMPORTANT: mount the persistent store FIRST so it overrides any legacy handlers.
app.use(sessionsStoreRoute);

// Other API routes
app.use('/', healthRoute);
app.use('/', authRoute);
app.use('/', playersRoute);
app.use('/', sessionsRoute);   // legacy fallback; keep after sessions.store
app.use('/', reviewsRoute);
app.use('/', wellnessRoute);
app.use('/', parentRoute);

// Catch-all: serve index.html for frontend routes, 404 for API-only paths
app.get('*', (req, res) => {
  const isApiRequest =
    req.path.startsWith('/auth')     ||
    req.path.startsWith('/sessions') ||
    req.path.startsWith('/parent')   ||
    req.path.startsWith('/players')  ||
    req.path.startsWith('/wellness') ||
    req.path.startsWith('/reviews')  ||
    req.path.startsWith('/health');

  if (isApiRequest) {
    return res.status(404).json({
      error: 'not_found',
      message: 'API route not found'
    });
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Player360 API running on port ${PORT}`);
});
