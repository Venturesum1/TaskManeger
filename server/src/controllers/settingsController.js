const settingsService = require('../services/settingsService');
const { success, serverError } = require('../helpers');

async function get(req, res) {
  try {
    const settings = await settingsService.getSettings();
    return success(res, settings);
  } catch (err) {
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const settings = await settingsService.updateSettings(req.body);
    return success(res, settings);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { get, update };
