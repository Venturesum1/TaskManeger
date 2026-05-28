require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Build allowed origins — env var takes priority, always include localhost
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // No origin = same-origin or non-browser (allow)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Block unknown origins but return 200 not 500
    console.warn('[CORS] Blocked:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 200,
};

// Handle ALL preflight OPTIONS requests first
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie');
  }
  res.sendStatus(200);
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/send-reminder', require('./routes/reminder'));
app.use('/api/health', require('./routes/health'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\nB4Utaskmanagement API — port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ') || 'none set'}`);
  console.log(`Env: ${process.env.NODE_ENV || 'development'}\n`);
});
