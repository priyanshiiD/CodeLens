const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'please-set-a-secret';

function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = { userId: decoded.userId, email: decoded.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = {
  protect,
};
