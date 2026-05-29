const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  company: {
    name: { type: String, default: 'B4Utaskmanagement' },
    logo: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  email: {
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    user: { type: String, default: '' },
    from: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
  },
  reminders: {
    deadlineWarningDays: { type: Number, default: 1 },
    meetingReminderMinutes: { type: Number, default: 60 },
    dailyDigestEnabled: { type: Boolean, default: true },
    dailyDigestTime: { type: String, default: '09:00' },
  },
  notifications: {
    emailEnabled: { type: Boolean, default: true },
    browserEnabled: { type: Boolean, default: true },
    whatsappEnabled: { type: Boolean, default: true },
  },
}, { timestamps: true });

module.exports = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
