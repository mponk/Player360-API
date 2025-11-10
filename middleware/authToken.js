// middleware/authToken.js
const jwt = require('jsonwebtoken');

/**
 * Ambil token dari cookie 'token' lalu taruh di req.user (kalau valid).
 * Tidak mewajibkan login (biarin route milih sendiri pakai authRequired atau tidak).
 */
function authToken(req, res, next) {
  try {
    const bearer = req.headers.authorization || '';
    const headerToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
    const cookieToken = req.cookies && req.cookies.token ? req.cookies.token : null;
    const token = headerToken || cookieToken;

    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role, name: payload.name };
    }
  } catch (_) {
    // ignore
  }
  next();
}

module.exports = authToken;
