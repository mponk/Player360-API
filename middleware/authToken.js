// middleware/authToken.js
module.exports = function getToken(req) {
  // Prioritas: Authorization: Bearer <token>
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (h && h.startsWith('Bearer ')) return h.slice(7);

  // Fallback: cookie 'p360' (HttpOnly)
  if (req.cookies && req.cookies.p360) return req.cookies.p360;

  // Fallback alternatif (opsional): X-Auth header
  const x = req.headers['x-auth'];
  if (x) return x;

  return null;
};
