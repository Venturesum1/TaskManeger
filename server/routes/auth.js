const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { connectDB } = require('../lib/db');
const { signToken, getAuthUser, cookieOptions, COOKIE_NAME } = require('../lib/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim())
      return res.status(400).json({ success: false, error: 'Email and password are required' });

    await connectDB();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role, name: user.name });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({
      success: true,
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Server error: ${err.message}` });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await connectDB();
    const user = await User.findById(auth.userId).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
