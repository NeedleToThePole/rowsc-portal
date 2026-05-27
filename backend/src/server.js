// ============================================================
// backend/src/server.js
// Main Express application entry point
// ROWSC Student Management Portal — Backend API
// ============================================================
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { verifyConnection } = require('./services/emailService');

const studentsRouter = require('./routes/students');
const webhookRouter  = require('./routes/webhook');
const emailRouter    = require('./routes/email');
const migrateRouter  = require('./routes/migrate');
const authRouter     = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ───────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret', 'X-JotForm-Signature'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'Email rate limit reached. Try again in 1 hour.' },
});

app.use(generalLimiter);

// ── Body Parsers ──────────────────────────────────────────────
// Jotform sends application/x-www-form-urlencoded — must come BEFORE json()
app.use('/api/webhooks', express.urlencoded({ extended: true, limit: '10mb' }));

// All other routes use JSON
app.use(express.json({ limit: '10mb' }));

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ROWSC Student Management Portal API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authLimiter,  authRouter);
app.use('/api/students',              studentsRouter);
app.use('/api/webhooks',              webhookRouter);
app.use('/api/email',    emailLimiter, emailRouter);
app.use('/api/admin',                 migrateRouter);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

// ── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   ROWSC Student Management Portal — Backend API      ║
╠══════════════════════════════════════════════════════╣
║  🚀 Server running at: http://localhost:${PORT}          ║
║  📁 Environment:       ${(process.env.NODE_ENV || 'development').padEnd(28)}║
╚══════════════════════════════════════════════════════╝
  `);

  // Verify email connection on startup
  verifyConnection();
});

module.exports = app;
