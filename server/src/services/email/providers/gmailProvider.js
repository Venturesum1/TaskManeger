const nodemailer = require('nodemailer');
const logger = require('../../../utils/logger');

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

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user, pass },
    });
  }

  async verify() {
    if (!this.configured) throw new Error('Email credentials not configured');
    await this.transporter.verify();
    logger.info('[GmailProvider] SMTP connection verified successfully');
  }

  async send({ to, subject, html }) {
    if (!this.configured) throw new Error('Email credentials not configured');
    const info = await this.transporter.sendMail({ from: this.from, to, subject, html });
    logger.info('[GmailProvider] Email sent', { to, subject, messageId: info.messageId });
    return info;
  }
}

let _instance = null;

function getProvider() {
  if (!_instance) _instance = new GmailProvider();
  return _instance;
}

module.exports = { GmailProvider, getProvider };
