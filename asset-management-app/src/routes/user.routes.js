const router = require('express').Router();
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/user.controller');

router.get('/', authorize('admin'), ctrl.getUsers);
router.get('/:id', authorize('admin'), ctrl.getUserById);
router.put('/:id', authorize('admin'), ctrl.updateUser);
router.put('/:id/deactivate', authorize('admin'), ctrl.deactivateUser);
router.put('/:id/reset-password', authorize('admin'), ctrl.resetPassword);

module.exports = router;
