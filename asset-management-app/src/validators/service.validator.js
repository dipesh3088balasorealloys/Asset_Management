const { body, param, query } = require('express-validator');
const { SERVICE_TYPES, SERVICE_STATUSES, BILLING_CYCLES } = require('../config/constants');

const createService = [
  body('type').isIn(SERVICE_TYPES).withMessage('Invalid service type'),
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('provider').trim().notEmpty().withMessage('Provider is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be >= 0'),
  body('status').optional().isIn(SERVICE_STATUSES).withMessage('Invalid status'),
  body('billingCycle').isIn(BILLING_CYCLES).withMessage('Invalid billing cycle'),
  body('startDate').isISO8601().withMessage('Start date is required'),
  body('endDate').isISO8601().withMessage('End date is required'),
  body('accountId').optional({ values: 'falsy' }).trim(),
  body('contactInfo').optional({ values: 'falsy' }).trim(),
  body('notes').optional({ values: 'falsy' }).trim(),
];

const updateService = [
  param('id').isInt().withMessage('Invalid service ID'),
  body('type').optional().isIn(SERVICE_TYPES).withMessage('Invalid service type'),
  body('name').optional().trim().notEmpty().withMessage('Service name cannot be empty'),
  body('provider').optional().trim().notEmpty().withMessage('Provider cannot be empty'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be >= 0'),
  body('status').optional().isIn(SERVICE_STATUSES).withMessage('Invalid status'),
  body('billingCycle').optional().isIn(BILLING_CYCLES).withMessage('Invalid billing cycle'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('accountId').optional({ values: 'falsy' }).trim(),
  body('contactInfo').optional({ values: 'falsy' }).trim(),
  body('notes').optional({ values: 'falsy' }).trim(),
];

const getServices = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('type').optional().isIn(SERVICE_TYPES),
  query('status').optional().isIn(['Active', 'Pending', 'Cancelled', 'Expired', 'RenewalDue']),
  query('search').optional().trim(),
  query('sort').optional().isIn(['name', 'type', 'cost', 'end_date', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

module.exports = { createService, updateService, getServices };
