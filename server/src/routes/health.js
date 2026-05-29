const express = require('express');
const router = express.Router();
const { connectDB, isConnected } = require('../database/mongodb');

router.get('/', async (req, res) => {
  const status = {
    app: 'B4Utaskmanagement API',
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    mongoUri: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':<hidden>@')
      : 'NOT SET',
    jwtSecret: process.env.JWT_SECRET ? 'SET ✓' : 'NOT SET',
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN),
  };

  try {
    await connectDB();
    status.database = 'CONNECTED ✅';
    return res.json({ success: true, data: status });
  } catch (err) {
    status.database = `FAILED ❌ — ${err.message}`;
    return res.status(503).json({ success: false, data: status });
  }
});

module.exports = router;
