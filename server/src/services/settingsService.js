const Settings = require('../models/Settings');
const { connectDB } = require('../database/mongodb');
const logger = require('../utils/logger');

const SETTINGS_KEY = 'global';

async function getSettings() {
  await connectDB();
  let settings = await Settings.findOne({ key: SETTINGS_KEY }).lean();
  if (!settings) {
    settings = await Settings.create({ key: SETTINGS_KEY });
    logger.info('[SettingsService] Default settings created');
  }
  return settings;
}

async function updateSettings(updates) {
  await connectDB();
  const settings = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: updates },
    { new: true, upsert: true }
  ).lean();
  logger.info('[SettingsService] Settings updated');
  return settings;
}

async function updateCompanySettings(company) {
  return updateSettings({ company });
}

async function updateEmailSettings(email) {
  return updateSettings({ email });
}

async function updateReminderSettings(reminders) {
  return updateSettings({ reminders });
}

async function updateNotificationSettings(notifications) {
  return updateSettings({ notifications });
}

module.exports = {
  getSettings,
  updateSettings,
  updateCompanySettings,
  updateEmailSettings,
  updateReminderSettings,
  updateNotificationSettings,
};
