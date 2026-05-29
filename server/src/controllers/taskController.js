const taskService = require('../services/taskService');
const activityService = require('../services/activityService');
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
    activityService.log({
      userId: req.auth.userId,
      action: 'created task',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
    });
    return created(res, task);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const prev = await taskService.getTaskById(req.params.id);
    const task = await taskService.updateTask(req.params.id, req.body);

    // Build meaningful activity details
    const changes = [];
    if (req.body.status && prev && req.body.status !== prev.status) {
      changes.push(`status → ${req.body.status.replace('_', ' ')}`);
    }
    if (req.body.priority && prev && req.body.priority !== prev.priority) {
      changes.push(`priority → ${req.body.priority}`);
    }
    if (req.body.owner && prev && req.body.owner.toString() !== prev.owner?.toString()) {
      changes.push('assignee changed');
    }

    activityService.log({
      userId: req.auth.userId,
      action: changes.length ? `updated task (${changes.join(', ')})` : 'updated task',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      details: changes.join(', '),
    });

    return success(res, task);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Task');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    const task = await taskService.getTaskById(req.params.id);
    await taskService.deleteTask(req.params.id);
    activityService.log({
      userId: req.auth.userId,
      action: 'deleted task',
      entityType: 'task',
      entityId: req.params.id,
      entityTitle: task?.title || '',
    });
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, create, update, remove };
