const express = require('express');
const router = express.Router();
const { connectDB } = require('../lib/db');

router.get('/', async (req, res) => {
  const status = {
    app: 'B4Utaskmanagement API',
    node: process.version,
    env: process.env.NODE_ENV,
    mongoUri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':<hidden>@') : 'NOT SET',
    jwtSecret: process.env.JWT_SECRET ? 'SET ✓' : 'NOT SET',
  };
  try {
    await connectDB();
    status.database = 'CONNECTED ✅';
  } catch (err) {
    status.database = `FAILED ❌ — ${err.message}`;
    return res.status(503).json(status);
  }
  res.json(status);
});

module.exports = router;
