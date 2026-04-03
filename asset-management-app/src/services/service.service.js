const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { daysDiff, getServiceStatus, getMonthlyServiceCost, getYearlyServiceCost } = require('../utils/dateUtils');
const { getById, softDelete } = require('../utils/queries');

function enrichService(s) {
  let computedStatus;
  if (s.status === 'Cancelled') computedStatus = 'Cancelled';
  else if (s.status === 'Pending') computedStatus = 'Pending';
  else {
    const diff = daysDiff(s.endDate);
    if (diff < 0) computedStatus = 'Expired';
    else if (diff <= 30) computedStatus = 'Renewal Due';
    else computedStatus = 'Active';
  }
  return {
    ...s,
    computedStatus,
    monthlyCost: getMonthlyServiceCost(s),
    yearlyCost: getYearlyServiceCost(s),
  };
}

async function listServices(q) {
  const { page, limit } = parsePagination(q);

  const type      = q.type      || null;
  const search    = q.search    || null;
  const status    = q.status    || null;
  const sortField = q.sort      || 'created_at';
  const sortDir   = q.order     || 'desc';

  const sets = await callProcMulti('SP_ASSET_SERVICE_LIST', [
    type, search, status, sortField, sortDir, page, limit,
  ]);

  const services = sets[0] || [];
  const total    = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  const enriched = services.map(enrichService);

  return { data: enriched, meta: buildPaginationMeta(page, limit, total) };
}

async function getService(id) {
  const rows = await getById('asset_services', id);
  if (!rows.length) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function createService(data, userId) {
  const result = await query(
    `INSERT INTO asset_services
       (type, name, provider, cost, status, billing_cycle,
        start_date, end_date, account_id, contact_info, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.type,
      data.name,
      data.provider,
      data.cost,
      data.status || 'Active',
      data.billingCycle,
      data.startDate,
      data.endDate,
      data.accountId || null,
      data.contactInfo || null,
      data.notes || null,
      userId || null,
    ]
  );
  return (await getById('asset_services', result.insertId))[0];
}

async function updateService(id, data) {
  const existing = await getService(id);

  await query(
    `UPDATE asset_services SET
       type = ?, name = ?, provider = ?, cost = ?, status = ?,
       billing_cycle = ?, start_date = ?, end_date = ?,
       account_id = ?, contact_info = ?, notes = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.type !== undefined ? data.type : existing.type,
      data.name !== undefined ? data.name : existing.name,
      data.provider !== undefined ? data.provider : existing.provider,
      data.cost !== undefined ? data.cost : existing.cost,
      data.status !== undefined ? data.status : existing.status,
      data.billingCycle !== undefined ? data.billingCycle : existing.billingCycle,
      data.startDate !== undefined ? data.startDate : existing.startDate,
      data.endDate !== undefined ? data.endDate : existing.endDate,
      data.accountId !== undefined ? (data.accountId || null) : existing.accountId,
      data.contactInfo !== undefined ? (data.contactInfo || null) : existing.contactInfo,
      data.notes !== undefined ? (data.notes || null) : existing.notes,
      id,
    ]
  );
  return getService(id);
}

async function deleteService(id) {
  await getService(id);
  await softDelete('asset_services', id);
  return { message: 'Service deleted successfully' };
}

async function getCostSummary() {
  const rows = await query(
    `SELECT
       ROUND(SUM(CASE billing_cycle
         WHEN 'Monthly' THEN cost
         WHEN 'Quarterly' THEN cost / 3
         WHEN 'Half-Yearly' THEN cost / 6
         WHEN 'Yearly' THEN cost / 12
         ELSE 0
       END), 2) AS totalMonthly,
       ROUND(SUM(CASE billing_cycle
         WHEN 'Monthly' THEN cost * 12
         WHEN 'Quarterly' THEN cost * 4
         WHEN 'Half-Yearly' THEN cost * 2
         WHEN 'Yearly' THEN cost
         ELSE 0
       END), 2) AS totalYearly
     FROM asset_services
     WHERE is_deleted = 0 AND status = 'Active'`
  );

  if (rows.length) {
    return {
      totalMonthly: parseFloat(rows[0].totalMonthly) || 0,
      totalYearly: parseFloat(rows[0].totalYearly) || 0,
    };
  }
  return { totalMonthly: 0, totalYearly: 0 };
}

module.exports = { listServices, getService, createService, updateService, deleteService, getCostSummary };
