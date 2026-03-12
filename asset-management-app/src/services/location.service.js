const { query } = require('../utils/db');

/**
 * List all active locations.
 */
async function listLocations() {
  return query('SELECT id, name, code FROM locations WHERE is_active = 1 ORDER BY id');
}

module.exports = { listLocations };
