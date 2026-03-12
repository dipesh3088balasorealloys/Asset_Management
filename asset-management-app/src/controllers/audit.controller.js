const auditService = require('../services/audit.service');

async function getAuditLogs(req, res, next) {
  try {
    const result = await auditService.getAuditLogs({
      page: req.query.page,
      limit: req.query.limit,
      action: req.query.action,
      entityType: req.query.entityType,
      userId: req.query.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getEntityHistory(req, res, next) {
  try {
    const logs = await auditService.getEntityHistory(
      req.params.entityType,
      req.params.entityId,
    );
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
}

module.exports = { getAuditLogs, getEntityHistory };
