// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * Ambil token dari:
 * 1) Authorization: Bearer <token>
 * 2) cookie 'p360'
 * 3) header 'x-auth' (fallback opsional)
 */
function getToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  if (req.cookies && req.cookies.p360) return req.cookies.p360;
  if (req.headers['x-auth']) return req.headers['x-auth'];
  return null;
}

/** Verifikasi JWT dan tempelkan ke req.user */
function verifyToken(req, res) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, name, iat, exp }
    return payload;
  } catch (_) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
}

/** Hanya butuh login saja (tanpa cek role) */
function requireAuth(req, res, next) {
  const p = verifyToken(req, res);
  if (!p) return;
  next();
}

/** Batasi ke role tertentu */
function requireRole(...roles) {
  return (req, res, next) => {
    const p = verifyToken(req, res);
    if (!p) return;
    if (roles.length && !roles.includes(p.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

const requireCoach = requireRole('coach');
const requireParent = requireRole('parent', 'coach'); // misal parent & coach boleh

module.exports = {
  getToken,
  requireAuth,
  requireRole,
  requireCoach,
  requireParent,
};
