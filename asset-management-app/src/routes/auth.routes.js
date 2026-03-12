const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { registerValidator, loginValidator, changePasswordValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerValidator, validate, auth, authorize('admin'), controller.register);
router.post('/login', loginLimiter, loginValidator, validate, controller.login);
router.get('/me', auth, controller.getMe);
router.put('/change-password', auth, changePasswordValidator, validate, controller.changePassword);

module.exports = router;
