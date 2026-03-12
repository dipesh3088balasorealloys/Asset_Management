const exportService = require('../services/export.service');

// Mapping of entity + format to the appropriate service function
const EXPORT_MAP = {
  assets: {
    csv: exportService.exportAssetsCsv,
    pdf: exportService.exportAssetsPdf,
  },
  licenses: {
    csv: exportService.exportLicensesCsv,
    pdf: exportService.exportLicensesPdf,
  },
  services: {
    csv: exportService.exportServicesCsv,
    pdf: exportService.exportServicesPdf,
  },
  assignments: {
    csv: exportService.exportAssignmentsCsv,
    pdf: exportService.exportAssignmentsPdf,
  },
};

const VALID_ENTITIES = Object.keys(EXPORT_MAP);
const VALID_FORMATS = ['csv', 'pdf'];

async function exportData(req, res, next) {
  try {
    const { entity } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();

    // Validate entity
    if (!VALID_ENTITIES.includes(entity)) {
      const err = new Error(`Invalid entity "${entity}". Must be one of: ${VALID_ENTITIES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      const err = new Error(`Invalid format "${format}". Must be one of: ${VALID_FORMATS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const exportFn = EXPORT_MAP[entity][format];
    const result = await exportFn();

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${entity}-export-${timestamp}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(result);
    }

    // PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.setHeader('Content-Length', result.length);
    return res.send(result);
  } catch (err) {
    next(err);
  }
}

// Report-specific export handler
const { getEffectiveLocationIds } = require('../middleware/locationFilter');

async function exportReportData(req, res, next) {
  try {
    const { reportType } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();

    if (!['csv', 'pdf'].includes(format)) {
      const err = new Error(`Invalid format "${format}". Must be csv or pdf.`);
      err.statusCode = 400;
      throw err;
    }

    const locationIds = getEffectiveLocationIds(req.user);
    const result = await exportService.exportReport(reportType, format, locationIds);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${reportType}-report-${timestamp}`;

    if (result.type === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(result.content);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.setHeader('Content-Length', result.content.length);
    return res.send(result.content);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportData, exportReportData };
