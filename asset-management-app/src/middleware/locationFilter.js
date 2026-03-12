/**
 * Get effective location IDs for a user.
 * Admin → null (no filter, sees all locations)
 * Manager/Viewer → array of permitted location IDs
 */
function getEffectiveLocationIds(user) {
  if (!user) return [];
  if (user.role === 'admin') return null; // null = no filter (all locations)
  return user.locationIds || []; // empty = sees nothing
}

/**
 * Convert locationIds array to comma-separated string for stored procedures.
 * null → null (admin, no filter)
 * [] → '' (no locations = empty result)
 * [1,3] → '1,3'
 */
function locationIdsToString(locationIds) {
  if (locationIds === null) return null; // admin
  if (!locationIds || locationIds.length === 0) return '0'; // no access - use 0 to match nothing
  return locationIds.join(',');
}

module.exports = { getEffectiveLocationIds, locationIdsToString };
