const { query } = require('../utils/db');

/**
 * Express middleware factory that automatically logs mutations to the audit log.
 *
 * Usage:
 *   router.post('/', auditLog('CREATE', 'Asset'), createAsset);
 *   router.put('/:id', auditLog('UPDATE', 'Asset'), updateAsset);
 *   router.delete('/:id', auditLog('DELETE', 'Asset'), removeAsset);
 */

// Map entityType → database table name
const ENTITY_TABLE = {
  Asset: 'assets',
  License: 'licenses',
  Service: 'services',
  Assignment: 'assignments',
  EWaste: 'ewaste',
  ServerBackup: 'server_backups',
  DbBackup: 'db_backups',
  EmployeeBackup: 'employee_backups',
  User: 'users',
};

// Fields to exclude from audit snapshots (sensitive / noisy)
const EXCLUDE_FIELDS = [
  'password', 'passwordHash', 'password_hash',
  'createdAt', 'created_at', 'updatedAt', 'updated_at',
  'isDeleted', 'is_deleted', 'createdBy', 'created_by',
];

function cleanRecord(row) {
  if (!row) return null;
  const obj = {};
  for (const [key, val] of Object.entries(row)) {
    if (EXCLUDE_FIELDS.includes(key)) continue;
    obj[key] = val;
  }
  return obj;
}

function auditLog(action, entityType) {
  return async (req, res, next) => {
    let oldRecord = null;

    // For DELETE, UNASSIGN, and UPDATE — grab the existing record first
    if (['DELETE', 'UNASSIGN', 'UPDATE'].includes(action)) {
      const table = ENTITY_TABLE[entityType];
      const recordId = req.params.id;
      if (table && recordId) {
        try {
          const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [Number(recordId)]);
          if (rows && rows.length > 0) {
            oldRecord = cleanRecord(rows[0]);
          }
        } catch (err) {
          // Don't block the request if snapshot fails
          console.error('[AuditLog] Failed to snapshot old record:', err.message);
        }
      }
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // After successful response, log the audit entry
      if (body?.success) {
        const entityId = body.data?.id || req.params.id;

        let oldValues = null;
        let newValues = null;

        if (action === 'DELETE' || action === 'UNASSIGN') {
          oldValues = oldRecord ? JSON.stringify(oldRecord) : null;
        } else if (action === 'UPDATE') {
          oldValues = oldRecord ? JSON.stringify(oldRecord) : null;
          newValues = req.body ? JSON.stringify(req.body) : null;
        } else if (['CREATE', 'IMPORT'].includes(action)) {
          newValues = req.body ? JSON.stringify(req.body) : null;
        }

        query(
          'INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            req.user?.id || null,
            action,
            entityType,
            entityId ? Number(entityId) : null,
            oldValues,
            newValues,
            req.ip || req.connection?.remoteAddress,
            req.get('user-agent'),
          ]
        ).catch(() => {}); // fire and forget
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = auditLog;
