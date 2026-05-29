module.exports = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  from: process.env.EMAIL_FROM || `B4Utaskmanagement <${process.env.EMAIL_USER}>`,
  maxRetries: 3,
  retryDelayMs: 2000,
};
