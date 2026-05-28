/**
 * Seed script — creates only the admin account, nothing else.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Reads credentials from ADMIN_EMAIL / ADMIN_PASSWORD in .env
 */

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env file not found at', envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

if (!MONGODB_URI) { console.error('ERROR: MONGODB_URI not set in .env'); process.exit(1); }
if (!ADMIN_EMAIL) { console.error('ERROR: ADMIN_EMAIL not set in .env'); process.exit(1); }
if (!ADMIN_PASSWORD) { console.error('ERROR: ADMIN_PASSWORD not set in .env'); process.exit(1); }

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'member' },
  department: String,
  phone: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
const Meeting = mongoose.model('Meeting', new mongoose.Schema({}, { strict: false }));

async function seed() {
  console.log('\nTaskFlow — Admin Setup');
  console.log('──────────────────────────────');
  console.log('URI   :', MONGODB_URI.replace(/:([^@]+)@/, ':<hidden>@'));
  console.log('Admin :', ADMIN_EMAIL);
  console.log('──────────────────────────────\n');

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB\n');
  } catch (err) {
    console.error('MongoDB connection FAILED:', err.message);
    process.exit(1);
  }

  // Wipe everything
  await Task.deleteMany({});
  await Meeting.deleteMany({});
  await User.deleteMany({});
  console.log('Cleared all data');

  // Create only the admin account
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    password: hash,
    role: 'admin',
    department: '',
    phone: '',
  });

  console.log('Admin account created:', ADMIN_EMAIL);
  console.log('\nLogin with:');
  console.log('  Email   :', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);
  console.log('\nRun: npm run dev\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
