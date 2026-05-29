const mongoose = require('mongoose');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

let cached = global._mongooseCache || { conn: null, promise: null };
global._mongooseCache = cached;

async function connectDB() {
  if (!dbConfig.uri) throw new Error('MONGODB_URI not set in environment variables');
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    logger.info('[MongoDB] Connecting...');
    cached.promise = mongoose
      .connect(dbConfig.uri, dbConfig.options)
      .then((conn) => {
        logger.info('[MongoDB] Connected successfully');
        return conn;
      })
      .catch((err) => {
        logger.error('[MongoDB] Connection failed', { error: err.message });
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isConnected };
