const taskService = require('../services/taskService');
const { success, created, fail, notFound, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const tasks = await taskService.listTasks(req.query);
    return success(res, tasks);
  } catch (err) {
    return serverError(res, err);
  }
}

async function create(req, res) {
  try {
    const task = await taskService.createTask({ ...req.body, createdBy: req.auth.userId });
    return created(res, task);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    return success(res, task);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Task');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    await taskService.deleteTask(req.params.id);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, create, update, remove };
