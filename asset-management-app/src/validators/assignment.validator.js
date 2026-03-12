const { body, param, query } = require('express-validator');

const createAssignment = [
  body('empName').trim().notEmpty().withMessage('Employee name is required'),
  body('empId').trim().notEmpty().withMessage('Employee ID is required'),
  body('departmentId').optional({ values: 'falsy' }).isInt().withMessage('Invalid department ID'),
  body('empEmail').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
  body('assignDate').optional().isISO8601().withMessage('Invalid assignment date'),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('assetIds').isArray().withMessage('assetIds must be an array'),
  body('assetIds.*').isInt().withMessage('Each asset ID must be an integer'),
  body('licenseIds').isArray().withMessage('licenseIds must be an array'),
  body('licenseIds.*').isInt().withMessage('Each license ID must be an integer'),
  body().custom((value) => {
    if ((!value.assetIds || value.assetIds.length === 0) && (!value.licenseIds || value.licenseIds.length === 0)) {
      throw new Error('Select at least one asset or license');
    }
    return true;
  }),
];

const getAssignments = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('department').optional().trim(),
  query('search').optional().trim(),
  query('sort').optional().isIn(['emp_name', 'emp_id', 'assign_date', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

const updateAssignment = [
  body('empName').optional().trim().notEmpty().withMessage('Employee name cannot be empty'),
  body('empId').optional().trim().notEmpty().withMessage('Employee ID cannot be empty'),
  body('empEmail').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
  body('assignDate').optional().isISO8601().withMessage('Invalid assignment date'),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('departmentName').optional().trim(),
  body('location').optional().trim(),
  body('designation').optional().trim(),
  body('locationId').optional({ values: 'falsy' }).isInt().withMessage('Invalid location ID'),
];

module.exports = { createAssignment, updateAssignment, getAssignments };
