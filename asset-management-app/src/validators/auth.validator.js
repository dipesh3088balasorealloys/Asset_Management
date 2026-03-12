const { body } = require('express-validator');
const { USER_ROLES } = require('../config/constants');

const registerValidator = [
  body('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail().withMessage('A valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required'),
  body('role')
    .optional()
    .isIn(USER_ROLES).withMessage(`Role must be one of: ${USER_ROLES.join(', ')}`),
];

const loginValidator = [
  body('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

module.exports = { registerValidator, loginValidator, changePasswordValidator };
