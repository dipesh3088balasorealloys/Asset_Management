const { callProcMulti, query } = require('../utils/db');
const { daysDiff, getMonthlyServiceCost, getYearlyServiceCost, getServiceStatus, getStockStatus } = require('../utils/dateUtils');

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 5;
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20;

// -----------------------------------------------------------------------
// Location filter helper
// -----------------------------------------------------------------------

/**
 * Build a SQL snippet for location filtering.
 * @param {number[]|null} locationIds - null = admin (no filter), [] = no access, [1,3] = filter
 * @param {string} col - column name, e.g. 'a.location_id'
 * @returns {{ sql: string, params: number[] }}
 */
function _locationWhere(locationIds, col = 'a.location_id') {
  if (locationIds === null || locationIds === undefined) return { sql: '', params: [] };
  if (locationIds.length === 0) return { sql: ` AND ${col} IN (0)`, params: [] }; // match nothing
  return { sql: ` AND ${col} IN (?)`, params: [locationIds] };
}

// -----------------------------------------------------------------------
// Shared helper — attach Prisma-shaped assets[] and licenses[] to
// assignment rows, reused by getDashboardSummary and getEmployeeSummary.
// -----------------------------------------------------------------------

async function _attachRelations(assignments) {
  if (!assignments || assignments.length === 0) return assignments;

  const ids = assignments.map(a => a.id);

  const assetRows = ids.length
    ? await query(
        `SELECT aa.assignment_id, aa.asset_id, aa.quantity,
                a.id AS a_id, a.name AS a_name, a.category AS a_category
           FROM asset_assignment_assets aa
           JOIN asset_assets a ON aa.asset_id = a.id
          WHERE aa.assignment_id IN (?)`,
        [ids],
      )
    : [];

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

  const assetMap = {};
  for (const r of assetRows) {
    const aid = r.assignmentId;
    if (!assetMap[aid]) assetMap[aid] = [];
    assetMap[aid].push({
      assetId: r.assetId,
      assignmentId: aid,
      quantity: r.quantity,
      asset: { id: r.aId, name: r.aName, category: r.aCategory },
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
 * Nest department onto assignment row.
 */
function _nestDepartment(row) {
  if (!row) return row;
  row.department = (row.departmentId || row.departmentName)
    ? { id: row.departmentId || null, name: row.departmentName || null }
    : null;
  delete row.departmentName;
  return row;
}

// -----------------------------------------------------------------------
// Dashboard Summary
// -----------------------------------------------------------------------

async function getDashboardSummary(locationIds) {
  // Use the SP for license/service data (company-wide), then override asset stats with location-filtered queries
  const sets = await callProcMulti('SP_ASSET_REPORT_DASHBOARD_SUMMARY', []);

  const cardsRow = sets[0] && sets[0][0] ? sets[0][0] : {};

  // If location filtering is needed, override asset-related cards
  const loc = _locationWhere(locationIds);
  if (loc.sql) {
    const [assetStats] = await query(
      `SELECT COUNT(*) AS totalAssets, SUM(assigned) AS assignedAssets,
              (SELECT COUNT(DISTINCT a2.id) FROM asset_assignments a2 WHERE a2.is_active = 1${_locationWhere(locationIds, 'a2.location_id').sql}) AS employeesWithAssets
       FROM asset_assets a WHERE a.is_deleted = 0${loc.sql}`,
      [...loc.params, ..._locationWhere(locationIds, 'a2.location_id').params]
    );
    cardsRow.totalAssets = assetStats?.totalAssets || 0;
    cardsRow.assignedAssets = assetStats?.assignedAssets || 0;
    cardsRow.employeesWithAssets = assetStats?.employeesWithAssets || 0;
  }

  const cards = {
    totalAssets: cardsRow.totalAssets || 0,
    assignedAssets: cardsRow.assignedAssets || 0,
    availableAssets: (cardsRow.totalAssets || 0) - (cardsRow.assignedAssets || 0),
    totalLicenses: cardsRow.totalLicenses || 0,
    availableLicenses: cardsRow.availableLicenses || 0,
    activeServices: cardsRow.activeServices || 0,
    monthlyCost: cardsRow.monthlyCost != null
      ? Math.round(cardsRow.monthlyCost * 100) / 100
      : 0,
    employeesWithAssets: cardsRow.employeesWithAssets || 0,
    renewalsDue: cardsRow.renewalsDue || 0,
  };

  let recentAssignments = (sets[1] || []).map(_nestDepartment);
  // Filter recent assignments by location if needed
  if (locationIds !== null && locationIds !== undefined) {
    recentAssignments = recentAssignments.filter(a =>
      locationIds.includes(a.locationId)
    );
  }
  await _attachRelations(recentAssignments);

  const upcomingRenewals = sets[2] || [];

  // Filter low stock alerts by location
  let lowStockAlerts = sets[3] || [];
  if (locationIds !== null && locationIds !== undefined) {
    lowStockAlerts = lowStockAlerts.filter(a =>
      locationIds.includes(a.locationId)
    );
  }

  return { cards, recentAssignments, upcomingRenewals, lowStockAlerts };
}

// -----------------------------------------------------------------------
// Asset Utilization
// -----------------------------------------------------------------------

async function getAssetUtilization(locationIds) {
  const loc = _locationWhere(locationIds);
  const rows = await query(
    `SELECT
       category,
       SUM(quantity) AS total,
       SUM(assigned) AS assigned,
       SUM(available) AS available,
       ROUND(IF(SUM(quantity) > 0, SUM(assigned) / SUM(quantity) * 100, 0), 1) AS utilization
     FROM asset_assets a
     WHERE is_deleted = 0${loc.sql}
     GROUP BY category
     ORDER BY total DESC`,
    loc.params
  );

  const breakdown = rows.map(r => ({
    category: r.category,
    total: r.total || 0,
    assigned: r.assigned || 0,
    available: r.available || 0,
    utilization: r.utilization || 0,
  }));

  const totalAll = breakdown.reduce((s, r) => s + r.total, 0);
  const assignedAll = breakdown.reduce((s, r) => s + r.assigned, 0);
  const overallUtilization = totalAll > 0 ? Math.round((assignedAll / totalAll) * 100) : 0;

  return { overall: overallUtilization, breakdown };
}

// -----------------------------------------------------------------------
// License Utilization (company-wide — no location filter)
// -----------------------------------------------------------------------

async function getLicenseUtilization() {
  const rows = await query(
    `SELECT
       id, name, quantity, used, available,
       ROUND(IF(quantity > 0, used / quantity * 100, 0), 1) AS utilization,
       DATEDIFF(end_date, CURDATE()) AS days_remaining,
       end_date
     FROM asset_licenses
     WHERE is_deleted = 0
     ORDER BY utilization DESC`
  );

  const licenses = rows.map(r => {
    const daysRemaining = r.daysRemaining != null ? r.daysRemaining : daysDiff(r.endDate);
    let status = 'Active';
    if (daysRemaining < 0) status = 'Expired';
    else if (daysRemaining <= 30) status = 'Expiring Soon';

    return {
      id: r.id,
      name: r.name,
      quantity: r.quantity || 0,
      used: r.used || 0,
      available: r.available || 0,
      utilization: r.utilization || 0,
      daysRemaining,
      status,
    };
  });

  const total = licenses.reduce((s, l) => s + l.quantity, 0);
  const used = licenses.reduce((s, l) => s + l.used, 0);
  const utilization = total > 0 ? Math.round((used / total) * 100) : 0;

  return { total, used, available: total - used, utilization, licenses };
}

// -----------------------------------------------------------------------
// Service Cost Breakdown (company-wide — no location filter)
// -----------------------------------------------------------------------

async function getServiceCostBreakdown() {
  const sets = await callProcMulti('SP_ASSET_SERVICE_COST_BREAKDOWN', []);

  const byType = (sets[0] || []).map(r => ({
    type: r.type,
    count: r.count || 0,
    monthlyCost: r.monthlyCost != null ? Math.round(r.monthlyCost * 100) / 100 : 0,
    yearlyCost: r.yearlyCost != null ? Math.round(r.yearlyCost * 100) / 100 : 0,
  }));

  const totalsRow = sets[1] && sets[1][0] ? sets[1][0] : {};

  return {
    totalMonthly: totalsRow.totalMonthly != null
      ? Math.round(totalsRow.totalMonthly * 100) / 100
      : 0,
    totalYearly: totalsRow.totalYearly != null
      ? Math.round(totalsRow.totalYearly * 100) / 100
      : 0,
    breakdown: byType,
  };
}

// -----------------------------------------------------------------------
// Employee Summary
// -----------------------------------------------------------------------

async function getEmployeeSummary(locationIds) {
  const loc = _locationWhere(locationIds);
  const rows = await query(
    `SELECT
       a.id, a.emp_name, a.emp_id, a.emp_email, a.department_id,
       d.name AS department_name,
       l.name AS org_location_name,
       a.assign_date, a.notes, a.created_at,
       (SELECT COUNT(*) FROM asset_assignment_assets aa WHERE aa.assignment_id = a.id) AS asset_count,
       (SELECT COUNT(*) FROM asset_assignment_licenses al WHERE al.assignment_id = a.id) AS license_count
     FROM asset_assignments a
     LEFT JOIN asset_departments d ON a.department_id = d.id
     LEFT JOIN asset_locations l ON a.location_id = l.id
     WHERE a.is_active = 1${loc.sql}
     ORDER BY a.emp_name ASC`,
    loc.params
  );

  let assignments = rows.map(_nestDepartment);
  await _attachRelations(assignments);

  return assignments;
}

// -----------------------------------------------------------------------
// Upcoming Renewals (company-wide — no location filter)
// -----------------------------------------------------------------------

async function getUpcomingRenewals(days = 30) {
  const rows = await query(
    `(SELECT
        'license' AS item_type, id, name, NULL AS provider, vendor, end_date,
        DATEDIFF(end_date, CURDATE()) AS days_remaining
      FROM asset_licenses
      WHERE is_deleted = 0 AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY))
     UNION ALL
     (SELECT
        'service' AS item_type, id, name, provider, NULL AS vendor, end_date,
        DATEDIFF(end_date, CURDATE()) AS days_remaining
      FROM asset_services
      WHERE is_deleted = 0 AND status = 'Active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY))
     ORDER BY end_date ASC`,
    [days, days]
  );

  return rows.map(r => ({
    name: r.name,
    type: r.itemType,
    date: r.endDate,
    id: r.id,
    daysRemaining: r.daysRemaining != null ? r.daysRemaining : undefined,
  }));
}

// -----------------------------------------------------------------------
// Location Summary — executive bird's-eye view
// -----------------------------------------------------------------------

async function getLocationSummary(locationIds) {
  const locFilter = _locationWhere(locationIds, 'l.id');

  // Assets per location
  const assetRows = await query(
    `SELECT
       l.id AS location_id, l.name AS location_name, l.code AS location_code,
       IFNULL(SUM(a.quantity), 0) AS total_assets,
       IFNULL(SUM(a.assigned), 0) AS assigned_assets,
       IFNULL(SUM(a.available), 0) AS available_assets
     FROM asset_locations l
     LEFT JOIN asset_assets a ON a.location_id = l.id AND a.is_deleted = 0
     WHERE l.is_active = 1${locFilter.sql}
     GROUP BY l.id, l.name, l.code
     ORDER BY l.name`,
    locFilter.params
  );

  // Employees (active assignments) per location
  const empRows = await query(
    `SELECT
       l.id AS location_id,
       COUNT(DISTINCT asgn.id) AS employee_count
     FROM asset_locations l
     LEFT JOIN asset_assignments asgn ON asgn.location_id = l.id AND asgn.is_active = 1
     WHERE l.is_active = 1${locFilter.sql}
     GROUP BY l.id`,
    locFilter.params
  );

  // Licenses — company-wide
  const [licenseRow] = await query(
    `SELECT
       IFNULL(SUM(quantity), 0) AS total_licenses,
       IFNULL(SUM(used), 0) AS used_licenses,
       IFNULL(SUM(available), 0) AS available_licenses
     FROM asset_licenses WHERE is_deleted = 0`
  );

  // Services — company-wide
  const [serviceRow] = await query(
    `SELECT
       COUNT(*) AS active_services,
       IFNULL(ROUND(SUM(CASE billing_cycle
         WHEN 'Monthly' THEN cost
         WHEN 'Quarterly' THEN cost / 3
         WHEN 'Yearly' THEN cost / 12
         WHEN 'OneTime' THEN 0 ELSE 0 END), 2), 0) AS monthly_cost
     FROM asset_services WHERE is_deleted = 0 AND status = 'Active'`
  );

  // Build employee map
  const empMap = {};
  for (const r of empRows) empMap[r.locationId] = r.employeeCount;

  const locations = assetRows.map(r => ({
    locationId: r.locationId,
    locationName: r.locationName,
    locationCode: r.locationCode,
    totalAssets: Number(r.totalAssets) || 0,
    assignedAssets: Number(r.assignedAssets) || 0,
    availableAssets: Number(r.availableAssets) || 0,
    employees: Number(empMap[r.locationId]) || 0,
  }));

  const totals = {
    totalAssets: locations.reduce((s, l) => s + l.totalAssets, 0),
    assignedAssets: locations.reduce((s, l) => s + l.assignedAssets, 0),
    availableAssets: locations.reduce((s, l) => s + l.availableAssets, 0),
    totalLicenses: Number(licenseRow?.totalLicenses) || 0,
    usedLicenses: Number(licenseRow?.usedLicenses) || 0,
    availableLicenses: Number(licenseRow?.availableLicenses) || 0,
    activeServices: Number(serviceRow?.activeServices) || 0,
    monthlyCost: Number(serviceRow?.monthlyCost) || 0,
    totalEmployees: locations.reduce((s, l) => s + l.employees, 0),
  };

  return { locations, totals };
}

module.exports = {
  getDashboardSummary,
  getAssetUtilization,
  getLicenseUtilization,
  getServiceCostBreakdown,
  getEmployeeSummary,
  getUpcomingRenewals,
  getLocationSummary,
};
