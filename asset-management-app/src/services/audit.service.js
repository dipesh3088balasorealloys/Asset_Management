const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Create an audit log entry (fire-and-forget).
 */
async function logAction({ userId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent }) {
  try {
    await query(
      'INSERT INTO asset_audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId || null,
        action,
        entityType,
        entityId ? Number(entityId) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (err) {
    console.error('[AuditLog] Failed to log action:', err.message);
  }
}

/**
 * Retrieve paginated audit logs with optional filters.
 */
async function getAuditLogs({ page, limit, action, entityType, userId, startDate, endDate, search } = {}) {
  const pagination = parsePagination({ page, limit });

  const sets = await callProcMulti('SP_ASSET_AUDIT_LIST', [
    action || null,
    entityType || null,
    userId ? Number(userId) : null,
    startDate || null,
    endDate || null,
    pagination.page,
    pagination.limit,
    search || null,
  ]);

  const rows = sets[0] || [];
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  // Restructure flat columns into nested user object
  const logs = rows.map((row) => {
    const { fullName, email, role, userId, userIdRef, oldValues, newValues, ...rest } = row;
    return {
      ...rest,
      userId,
      oldValues: oldValues ? (typeof oldValues === 'string' ? JSON.parse(oldValues) : oldValues) : null,
      newValues: newValues ? (typeof newValues === 'string' ? JSON.parse(newValues) : newValues) : null,
      user: {
        id: userId,
        fullName: fullName || null,
        email: email || null,
        role: role || null,
      },
    };
  });

  return { data: logs, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}

/**
 * Get the full audit trail for a specific entity.
 */
async function getEntityHistory(entityType, entityId) {
  const rows = await query(
    `SELECT al.*, u.full_name AS user_full_name, u.email AS user_email, u.role AS user_role
     FROM asset_audit_log al
     LEFT JOIN asset_users u ON al.user_id = u.id
     WHERE al.entity_type = ? AND al.entity_id = ?
     ORDER BY al.created_at DESC`,
    [entityType, Number(entityId)]
  );

  return rows.map((row) => {
    const { userFullName, userEmail, userRole, userId, oldValues, newValues, ...rest } = row;
    return {
      ...rest,
      userId,
      oldValues: oldValues ? (typeof oldValues === 'string' ? JSON.parse(oldValues) : oldValues) : null,
      newValues: newValues ? (typeof newValues === 'string' ? JSON.parse(newValues) : newValues) : null,
      user: {
        id: userId,
        fullName: userFullName || null,
        email: userEmail || null,
        role: userRole || null,
      },
    };
  });
}

module.exports = { logAction, getAuditLogs, getEntityHistory };
