const nodemailer = require('nodemailer');
const logger = require('../../../utils/logger');

function makeTransport(port) {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // SSL for 465, STARTTLS for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function isConnectionError(err) {
  const connCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ESOCKET', 'ENOTFOUND'];
  return connCodes.includes(err.code) || /timeout|connection refused|connect/i.test(err.message);
}

class GmailProvider {
  constructor() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const fromName = process.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM?.split('<')[0]?.trim() || 'B4Utaskmanagement';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || user;

    this.configured = !!(user && pass);
    this.name = 'gmail';
    this.from = `${fromName} <${fromAddress || ''}>`;

    if (!this.configured) {
      logger.warn('[GmailProvider] EMAIL_USER or EMAIL_PASS not set — emails will be skipped');
      return;
    }

    // Primary transporter: port 587 (STARTTLS)
    this._primary = makeTransport(587);
    // Fallback transporter: port 465 (SSL) — created lazily on first connection error
    this._fallback = null;
  }

  _getFallback() {
    if (!this._fallback) {
      this._fallback = makeTransport(465);
      logger.info('[GmailProvider] Fallback transporter created (port 465 SSL)');
    }
    return this._fallback;
  }

  async verify() {
    if (!this.configured) throw new Error('Email credentials not configured');
    try {
      await this._primary.verify();
      logger.info('[GmailProvider] SMTP verified on port 587');
    } catch (err) {
      if (isConnectionError(err)) {
        logger.warn('[GmailProvider] Port 587 verify failed, trying port 465', { error: err.message });
        await this._getFallback().verify();
        logger.info('[GmailProvider] SMTP verified on port 465 (fallback)');
      } else {
        throw err;
      }
    }
  }

  async send({ to, subject, html }) {
    if (!this.configured) throw new Error('Email credentials not configured');

    try {
      const info = await this._primary.sendMail({ from: this.from, to, subject, html });
      logger.info('[GmailProvider] Sent via port 587', { to, messageId: info.messageId });
      return info;
    } catch (err) {
      if (!isConnectionError(err)) throw err; // auth error, bad recipient, etc. — don't retry

      logger.warn('[GmailProvider] Port 587 failed, retrying on port 465', { to, error: err.message });
      const info = await this._getFallback().sendMail({ from: this.from, to, subject, html });
      logger.info('[GmailProvider] Sent via port 465 (fallback)', { to, messageId: info.messageId });
      return info;
    }
  }
}

let _instance = null;

function getProvider() {
  if (!_instance) {
    if (process.env.BREVO_API_KEY) {
      const { BrevoProvider } = require('./brevoProvider');
      _instance = new BrevoProvider();
    } else {
      // Fallback: Gmail SMTP with 587→465 auto-retry
      _instance = new GmailProvider();
    }
  }
  return _instance;
}

module.exports = { GmailProvider, getProvider };
