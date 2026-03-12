const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });

  // MySQL duplicate entry error (errno 1062)
  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'A record with this value already exists' },
    });
  }

  // MySQL custom SIGNAL errors (SQLSTATE 45000)
  if (err.sqlState === '45000') {
    return res.status(400).json({
      success: false,
      error: { code: 'BUSINESS_ERROR', message: err.sqlMessage || err.message },
    });
  }

  // MySQL foreign key constraint error
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONSTRAINT_ERROR', message: 'Cannot delete: record is referenced by other data' },
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details },
    });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code || 'ERROR', message: err.message },
    });
  }

  // Default 500
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}

module.exports = errorHandler;
