const express = require('express');
const router = express.Router();

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');

// REGISTER COACH / ADMIN
// body:
// {
//   "name": "Coach Yuyun",
//   "email": "coach@example.com",
//   "password": "rahasia123",
//   "role": "coach"
// }
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'missing_fields',
        message: 'Name, email, password, and role are required' 
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ 
        error: 'email_exists',
        message: 'Email already used' 
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      athleteId: null
    });

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Internal server error' 
    });
  }
});

// LOGIN
// POST /auth/login
// Request body:
// {
//   "email": "coach@example.com",
//   "password": "secret"
// }
// Response body:
// {
//   "token": "JWT_STRING_HERE",
//   "user": {
//     "id": "userIdString",
//     "name": "Coach Yuyun",
//     "role": "coach"
//   }
// }
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'missing_fields',
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'invalid_credentials',
        message: 'Invalid email or password' 
      });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ 
        error: 'invalid_credentials',
        message: 'Invalid email or password' 
      });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Internal server error' 
    });
  }
});

module.exports = router;
