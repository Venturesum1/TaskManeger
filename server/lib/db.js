const mongoose = require('mongoose');

let cached = global._mongooseCache || { conn: null, promise: null };
global._mongooseCache = cached;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment variables');
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }).catch(err => { cached.promise = null; throw err; });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDB };
