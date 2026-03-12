const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user, message: 'User registered successfully' });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { employeeId, password } = req.body;
    const result = await authService.login(employeeId, password);
    res.json({ success: true, data: { token: result.token, user: result.user } });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
}

module.exports = { register, login, getMe, changePassword };
