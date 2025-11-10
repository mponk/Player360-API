// routes/auth.js
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');

// REGISTER
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'missing_fields', message: 'Name, email, password, role are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'email_exists', message: 'Email already used' });

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role, athleteId: null });

    res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// LOGIN + set-cookie
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'missing_fields', message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signToken(user);

    // Set cookie so same-origin frontend auto-auth tanpa perlu header
    res.cookie('p360', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true kalau sudah pakai HTTPS valid
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token,
      user: { id: user._id.toString(), name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// LOGOUT (opsional)
router.post('/auth/logout', (req, res) => {
  res.clearCookie('p360', { httpOnly: true, sameSite: 'lax', secure: false });
  res.json({ ok: true });
});

module.exports = router;
