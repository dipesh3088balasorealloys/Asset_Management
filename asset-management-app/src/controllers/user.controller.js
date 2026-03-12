const userService = require('../services/user.service');

async function getUsers(req, res, next) {
  try {
    const result = await userService.getUsers(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(parseInt(req.params.id));
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(parseInt(req.params.id), req.body);
    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (err) { next(err); }
}

async function deactivateUser(req, res, next) {
  try {
    const user = await userService.deactivateUser(parseInt(req.params.id));
    res.json({ success: true, data: user, message: 'User deactivated successfully' });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password is required' },
      });
    }
    const user = await userService.resetPassword(parseInt(req.params.id), newPassword);
    res.json({ success: true, data: user, message: 'Password reset successfully' });
  } catch (err) { next(err); }
}

module.exports = { getUsers, getUserById, updateUser, deactivateUser, resetPassword };
