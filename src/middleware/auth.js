const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT for admin routes
 * Reads token from Authorization: Bearer <token> header
 * or from x-admin-token header (for convenience in admin pages)
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = adminAuth;
