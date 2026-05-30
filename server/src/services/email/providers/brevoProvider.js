const https = require('https');
const logger = require('../../../utils/logger');

class BrevoProvider {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.configured = !!this.apiKey;
    this.name = 'brevo';

    this.fromName = process.env.EMAIL_FROM_NAME || 'B4Utaskmanagement';
    this.fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

    if (!this.configured) {
      logger.warn('[BrevoProvider] BREVO_API_KEY not set');
    } else {
      logger.info('[BrevoProvider] Initialised (HTTP API — works on Render)');
    }
  }

  async verify() {
    if (!this.configured) throw new Error('BREVO_API_KEY not set');
    // HTTP API — no SMTP socket verify needed
  }

  send({ to, subject, html }) {
    if (!this.configured) return Promise.reject(new Error('BREVO_API_KEY not set'));

    const body = JSON.stringify({
      sender:      { name: this.fromName, email: this.fromEmail },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.brevo.com',
        port:     443,
        path:     '/v3/smtp/email',
        method:   'POST',
        headers: {
          'api-key':       this.apiKey,
          'Content-Type':  'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Accept':        'application/json',
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            logger.info('[BrevoProvider] Sent', { to, subject, messageId: parsed.messageId });
            resolve({ messageId: parsed.messageId });
          } else {
            reject(new Error(`Brevo error ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = { BrevoProvider };
