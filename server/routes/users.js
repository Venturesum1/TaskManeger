const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { connectDB } = require('../lib/db');
const { getAuthUser } = require('../lib/auth');

router.get('/', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin')
    return res.status(403).json({ success: false, error: 'Admin access required' });
  try {
    await connectDB();
    const { name, email, password, role, department, phone } = req.body;
    if (!name?.trim() || !email?.trim() || !password?.trim())
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ success: false, error: 'Email already registered' });

    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role: role || 'member', department, phone });
    res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'Email already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const { name, role, department, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { name, role, department, phone } }, { new: true }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin')
    return res.status(403).json({ success: false, error: 'Admin access required' });
  try {
    await connectDB();
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
