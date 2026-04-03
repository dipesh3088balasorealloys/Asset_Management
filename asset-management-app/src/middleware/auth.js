const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');
const { USER_COLS } = require('../utils/queries');

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Access token is required' },
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === 'TokenExpiredError'
        ? 'Token has expired'
        : 'Invalid token';
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      });
    }

    const rows = await query(`SELECT ${USER_COLS} FROM asset_users WHERE id = ?`, [decoded.userId]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Account is deactivated' },
      });
    }

    // Attach user's permitted locations
    if (user.role === 'admin') {
      user.locations = []; // admin sees all — no restriction
      user.locationIds = null; // null = no filter
    } else {
      const locationRows = await query(
        'SELECT l.id, l.name, l.code FROM asset_user_locations ul JOIN asset_locations l ON ul.location_id = l.id WHERE ul.user_id = ?',
        [user.id]
      );
      user.locations = locationRows; // [{id, name, code}, ...]
      user.locationIds = locationRows.map(l => l.id); // [1, 3]
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
