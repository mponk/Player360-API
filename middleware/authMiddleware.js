const { verifyToken } = require('../utils/jwt');

function authRequired(rolesAllowed = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'No token' });
    }

    const token = parts[1];

    try {
      const decoded = verifyToken(token);

      if (rolesAllowed.length > 0 && !rolesAllowed.includes(decoded.role)) {
        return res.status(403).json({ 
          error: 'forbidden',
          message: 'role not allowed'
        });
      }

      req.user = decoded; // { id, role, name }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = { authRequired };
