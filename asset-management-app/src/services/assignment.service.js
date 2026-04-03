const { callProc, callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
// Email notification removed — SMTP used only for expiry reminders

// -----------------------------------------------------------------------
// Helpers — fetch assets & licenses for one or many assignment IDs and
// attach them in the exact Prisma nested shape the controllers expect:
//   assignment.assets  = [{ assetId, assignmentId, quantity, asset: { id, name, category } }]
//   assignment.licenses = [{ licenseId, assignmentId, quantity, license: { id, name } }]
// -----------------------------------------------------------------------

async function _attachRelations(assignments) {
  if (!assignments || assignments.length === 0) return assignments;

  const ids = assignments.map(a => a.id);

  // Fetch assignment_assets + joined asset columns
  const assetRows = ids.length
    ? await query(
        `SELECT aa.assignment_id, aa.asset_id, aa.quantity,
                a.id AS a_id, a.name AS a_name, a.category AS a_category, a.serial_no AS a_serial_no
           FROM asset_assignment_assets aa
           JOIN asset_assets a ON aa.asset_id = a.id
          WHERE aa.assignment_id IN (?)`,
        [ids],
      )
    : [];

  // Fetch assignment_licenses + joined license columns
  const licenseRows = ids.length
    ? await query(
        `SELECT al.assignment_id, al.license_id, al.quantity,
                l.id AS l_id, l.name AS l_name
           FROM asset_assignment_licenses al
           JOIN asset_licenses l ON al.license_id = l.id
          WHERE al.assignment_id IN (?)`,
        [ids],
      )
    : [];

  // Group by assignmentId
  const assetMap = {};
  for (const r of assetRows) {
    const aid = r.assignmentId;
    if (!assetMap[aid]) assetMap[aid] = [];
    assetMap[aid].push({
      assetId: r.assetId,
      assignmentId: aid,
      quantity: r.quantity,
      asset: { id: r.aId, name: r.aName, category: r.aCategory, serialNo: r.aSerialNo || null },
    });
  }

  const licenseMap = {};
  for (const r of licenseRows) {
    const aid = r.assignmentId;
    if (!licenseMap[aid]) licenseMap[aid] = [];
    licenseMap[aid].push({
      licenseId: r.licenseId,
      assignmentId: aid,
      quantity: r.quantity,
      license: { id: r.lId, name: r.lName },
    });
  }

  for (const a of assignments) {
    a.assets = assetMap[a.id] || [];
    a.licenses = licenseMap[a.id] || [];
  }

  return assignments;
}

/**
 * Attach department as nested object to match Prisma shape:
 *   assignment.department = { id, name }
 * The SP returns flat columns departmentId + departmentName.
 */
function _nestDepartment(row) {
  if (!row) return row;
  const dept = row.departmentId
    ? { id: row.departmentId, name: row.departmentName || null }
    : null;
  row.department = dept;
  // Remove flat columns so shape matches Prisma output
  delete row.departmentName;
  return row;
}

// -----------------------------------------------------------------------
// Service functions
// -----------------------------------------------------------------------

async function listAssignments(queryParams, locationIds) {
  const { page, limit } = parsePagination(queryParams);
  const search = queryParams.search || '';
  const department = queryParams.department || '';

  const sortField = queryParams.sort || 'created_at';
  const sortDir = queryParams.order || 'desc';

  // Convert locationIds to SP-compatible string
  const { locationIdsToString } = require('../middleware/locationFilter');
  const locStr = locationIdsToString(locationIds);

  const sets = await callProcMulti('SP_ASSET_ASSIGNMENT_LIST', [
    search,
    department,
    locStr,
    sortField,
    sortDir,
    page,
    limit,
  ]);

  // sets[0] = assignment rows (flat), sets[1] = [{ total }]
  let assignments = (sets[0] || []).map(_nestDepartment);
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  // Attach assets & licenses
  await _attachRelations(assignments);

  return { data: assignments, meta: buildPaginationMeta(page, limit, total) };
}

async function getAssignment(id) {
  const rows = await callProc('SP_ASSET_ASSIGNMENT_GET', [id]);

  if (!rows || rows.length === 0) {
    const err = new Error('Assignment not found');
    err.statusCode = 404;
    throw err;
  }

  const assignment = _nestDepartment(rows[0]);
  await _attachRelations([assignment]);

  return assignment;
}

async function createAssignment(data, userId) {
  const assetIds = data.assetIds?.join(',') || '';
  const licenseIds = data.licenseIds?.join(',') || '';

  const rows = await callProc('SP_ASSET_ASSIGNMENT_CREATE', [
    data.empName,
    data.empId,
    data.departmentName || '',
    data.empEmail || '',
    data.location || '',
    data.designation || '',
    data.locationId || null,
    data.assignDate || new Date().toISOString().slice(0, 10),
    data.notes || '',
    userId || null,
    assetIds,
    licenseIds,
  ]);

  if (!rows || rows.length === 0) {
    throw new Error('Failed to create assignment');
  }

  // SP returns the new assignment id; fetch full record with relations
  const newId = rows[0].id;
  const assignment = await getAssignment(newId);

  return assignment;
}

async function removeAssignment(id) {
  const rows = await callProc('SP_ASSET_ASSIGNMENT_REMOVE', [id]);

  // SP will throw / return empty if not found — handle gracefully
  if (!rows || rows.length === 0 || (rows[0] && rows[0].affected === 0)) {
    const err = new Error('Assignment not found');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Assignment removed. Items returned to inventory.' };
}

async function updateAssignment(id, data) {
  // Only update employee / assignment details — assets/licenses stay unchanged
  const fields = [];
  const params = [];

  if (data.empName !== undefined)   { fields.push('emp_name = ?');   params.push(data.empName); }
  if (data.empId !== undefined)     { fields.push('emp_id = ?');     params.push(data.empId); }
  if (data.empEmail !== undefined)  { fields.push('emp_email = ?');  params.push(data.empEmail || ''); }
  if (data.location !== undefined)  { fields.push('location = ?');   params.push(data.location || null); }
  if (data.designation !== undefined) { fields.push('designation = ?'); params.push(data.designation || null); }
  if (data.assignDate !== undefined)  { fields.push('assign_date = ?'); params.push(data.assignDate); }
  if (data.notes !== undefined)     { fields.push('notes = ?');      params.push(data.notes || null); }
  if (data.locationId !== undefined) { fields.push('location_id = ?'); params.push(data.locationId || null); }

  // Handle department (find-or-create)
  if (data.departmentName !== undefined) {
    if (data.departmentName) {
      const [existing] = await query('SELECT id FROM asset_departments WHERE name = ? LIMIT 1', [data.departmentName]);
      let deptId;
      if (existing) {
        deptId = existing.id;
      } else {
        const result = await query('INSERT INTO asset_departments (name) VALUES (?)', [data.departmentName]);
        deptId = result.insertId;
      }
      fields.push('department_id = ?');
      params.push(deptId);
    } else {
      fields.push('department_id = NULL');
    }
  }

  if (fields.length === 0) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    throw err;
  }

  params.push(id);
  const result = await query(
    `UPDATE asset_assignments SET ${fields.join(', ')} WHERE id = ? AND is_active = 1`,
    params
  );

  if (result.affectedRows === 0) {
    const err = new Error('Assignment not found');
    err.statusCode = 404;
    throw err;
  }

  return getAssignment(id);
}

module.exports = { listAssignments, getAssignment, createAssignment, updateAssignment, removeAssignment };
