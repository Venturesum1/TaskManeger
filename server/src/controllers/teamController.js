const teamService = require('../services/teamService');
const { success, created, fail, notFound, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const members = await teamService.listMembers();
    return success(res, members);
  } catch (err) {
    return serverError(res, err);
  }
}

async function create(req, res) {
  try {
    const member = await teamService.createMember(req.body);
    return created(res, member);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    if (err.statusCode === 409) return fail(res, err.message, 409);
    if (err.code === 11000) return fail(res, 'Email already exists', 409);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const member = await teamService.updateMember(req.params.id, req.body);
    return success(res, member);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Member');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    await teamService.removeMember(req.params.id);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, create, update, remove };
