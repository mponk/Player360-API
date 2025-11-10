require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');

// middleware opsional yang cuma mengisi req.user dari header/cookie
const authToken = require('./middleware/authToken');

const app = express();

// routes prioritas (store) HARUS duluan
const sessionsStoreRoute = require('./routes/sessions.store');

// modul route
const healthRoute   = require('./routes/health');
const authRoute     = require('./routes/auth');
const playersRoute  = require('./routes/players');
const sessionsRoute = require('./routes/sessions');   // legacy/fallback
const reviewsRoute  = require('./routes/reviews');
const wellnessRoute = require('./routes/wellness');
const parentRoute   = require('./routes/parent');

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// isi req.user bila ada token (tidak memaksa)
app.use(authToken);

connectDB();

// static (kalau ada)
app.use(express.static(path.join(__dirname, 'public')));

// urutan route
app.use(sessionsStoreRoute);
app.use('/', healthRoute);
app.use('/', authRoute);
app.use('/', playersRoute);
app.use('/', sessionsRoute);
app.use('/', reviewsRoute);
app.use('/', wellnessRoute);
app.use('/', parentRoute);

// catch-all untuk FE
app.get('*', (req, res) => {
  const isApi =
    req.path.startsWith('/auth')     ||
    req.path.startsWith('/sessions') ||
    req.path.startsWith('/parent')   ||
    req.path.startsWith('/players')  ||
    req.path.startsWith('/wellness') ||
    req.path.startsWith('/reviews')  ||
    req.path.startsWith('/health');

  if (isApi) {
    return res.status(404).json({ error: 'not_found', message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Player360 API running on port ${PORT}`);
});
