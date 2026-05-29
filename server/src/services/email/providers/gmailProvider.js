const nodemailer = require('nodemailer');
const logger = require('../../../utils/logger');

class GmailProvider {
  constructor() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const fromName = process.env.EMAIL_FROM_NAME || 'B4Utaskmanagement';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || user;

    if (!user || !pass) {
      throw new Error('EMAIL_USER and EMAIL_PASS must be set in environment variables');
    }

    this.name = 'gmail';
    this.from = `${fromName} <${fromAddress}>`;

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user, pass },
    });
  }

  async verify() {
    await this.transporter.verify();
    logger.info('[GmailProvider] SMTP connection verified successfully');
  }

  async send({ to, subject, html }) {
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
    });
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
