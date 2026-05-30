const Task = require('../models/Task');
const { connectDB } = require('../database/mongodb');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

const POPULATE_OWNER = 'name email department phone';
const POPULATE_CREATED_BY = 'name email';

async function listTasks(filters = {}) {
  await connectDB();
  const query = {};
  if (filters.status && filters.status !== 'all') query.status = filters.status;
  if (filters.priority && filters.priority !== 'all') query.priority = filters.priority;
  if (filters.owner && filters.owner !== 'all') query.owner = filters.owner;
  if (filters.search) query.title = { $regex: filters.search, $options: 'i' };

  return Task.find(query)
    .populate('owner', POPULATE_OWNER)
    .populate('createdBy', POPULATE_CREATED_BY)
    .sort({ createdAt: -1 })
    .lean();
}

async function createTask({ title, description, owner, priority, status, startDate, endDate, milestone, projectId, milestoneId, createdBy }) {
  await connectDB();
  if (!title?.trim() || !owner) {
    throw Object.assign(new Error('Title and owner are required'), { statusCode: 400 });
  }

  const task = await Task.create({
    title: title.trim(),
    description,
    owner,
    priority: priority || 'medium',
    status: status || 'not_started',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    milestone,
    projectId: projectId || undefined,
    milestoneId: milestoneId || undefined,
    createdBy,
  });

  const populated = await task.populate('owner', POPULATE_OWNER);

  notificationService.createNotification({
    userId: owner,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `You have been assigned a new task: "${task.title}"`,
    metadata: { taskId: task._id },
  }).catch((err) => logger.error('[TaskService] Notification failed', { error: err.message }));

  logger.info('[TaskService] Task created', { taskId: task._id, title: task.title });
  return populated;
}

async function getTaskById(id) {
  await connectDB();
  return Task.findById(id).populate('owner', POPULATE_OWNER).lean();
}

async function updateTask(id, updates) {
  await connectDB();
  const task = await Task.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate('owner', POPULATE_OWNER)
    .lean();
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  logger.info('[TaskService] Task updated', { taskId: id });
  return task;
}

async function deleteTask(id) {
  await connectDB();
  await Task.findByIdAndDelete(id);
  logger.info('[TaskService] Task deleted', { taskId: id });
}

async function assignTask(id, ownerId) {
  return updateTask(id, { owner: ownerId });
}

async function updateStatus(id, status) {
  return updateTask(id, { status });
}

async function updatePriority(id, priority) {
  return updateTask(id, { priority });
}

async function markCompleted(id) {
  return updateTask(id, { status: 'completed' });
}

async function getOverdueTasks() {
  await connectDB();
  const now = new Date();
  return Task.find({
    endDate: { $lt: now },
    status: { $nin: ['completed'] },
  })
    .populate('owner', POPULATE_OWNER)
    .lean();
}

async function getTasksDueTomorrow() {
  await connectDB();
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return Task.find({
    endDate: { $gte: start, $lte: end },
    status: { $nin: ['completed'] },
  })
    .populate('owner', POPULATE_OWNER)
    .lean();
}

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  updateStatus,
  updatePriority,
  markCompleted,
  getOverdueTasks,
  getTasksDueTomorrow,
};
