// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware: wajib login + (opsional) cek role.
 * Contoh:
 *   router.get('/x', authRequired());                     // cukup login
 *   router.post('/x', authRequired(['coach','admin']));   // login + role
 */
function authRequired(roles = []) {
  return (req, res, next) => {
    try {
      // Ambil token dari header/cookie (lihat authToken.js untuk helper khusus FE)
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

      if (!token) {
        return res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role, name: payload.name };

      if (Array.isArray(roles) && roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'forbidden', message: 'Insufficient role' });
      }

      return next();
    } catch (err) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }
  };
}

/**
 * optionalAuth: kalau ada token valid → set req.user; kalau tidak → lanjut tanpa error.
 */
function optionalAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role, name: payload.name };
    }
  } catch (_) {
    // abaikan token invalid
  }
  next();
}

/* Export kompatibel dua gaya:
   - const { authRequired } = require('../middleware/authMiddleware')
   - const mw = require('../middleware/authMiddleware'); mw.authRequired(...)
*/
module.exports = authRequired;              // default
module.exports.authRequired = authRequired; // named
module.exports.optionalAuth = optionalAuth; // named
