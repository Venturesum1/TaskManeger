const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const { connectDB } = require('../database/mongodb');
const logger = require('../utils/logger');

const POPULATE_OWNER = 'name email avatar';

async function listMilestones(filters = {}) {
  await connectDB();
  const query = {};
  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.status && filters.status !== 'all') query.status = filters.status;
  if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

  const milestones = await Milestone.find(query)
    .populate('projectId', 'name status')
    .populate('owner', POPULATE_OWNER)
    .sort({ createdAt: -1 })
    .lean();

  // Auto-calculate progress from linked tasks
  const enriched = await Promise.all(milestones.map(async (m) => {
    const tasks = await Task.find({ milestoneId: m._id }).select('status').lean();
    if (tasks.length > 0) {
      const completed = tasks.filter(t => t.status === 'completed').length;
      m.progress = Math.round((completed / tasks.length) * 100);
      m.taskCount = tasks.length;
      m.completedTaskCount = completed;
    } else {
      m.taskCount = 0;
      m.completedTaskCount = 0;
    }
    return m;
  }));

  return enriched;
}

async function getMilestoneById(id) {
  await connectDB();
  const milestone = await Milestone.findById(id)
    .populate('projectId', 'name status')
    .populate('owner', POPULATE_OWNER)
    .lean();
  if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });

  const tasks = await Task.find({ milestoneId: id }).populate('owner', 'name email').lean();
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : milestone.progress;

  return { ...milestone, tasks, progress, taskCount: tasks.length, completedTaskCount: completedCount };
}

async function createMilestone({ projectId, name, description, owner, status, startDate, endDate }) {
  await connectDB();
  if (!name?.trim()) throw Object.assign(new Error('Milestone name is required'), { statusCode: 400 });
  if (!projectId) throw Object.assign(new Error('Project is required'), { statusCode: 400 });

  const milestone = await Milestone.create({
    projectId,
    name: name.trim(),
    description: description || '',
    owner: owner || undefined,
    status: status || 'not_started',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    progress: 0,
  });

  const populated = await milestone.populate([
    { path: 'projectId', select: 'name status' },
    { path: 'owner', select: POPULATE_OWNER },
  ]);

  logger.info('[MilestoneService] Milestone created', { milestoneId: milestone._id, name: milestone.name });
  return populated;
}

async function updateMilestone(id, updates) {
  await connectDB();
  const milestone = await Milestone.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate('projectId', 'name status')
    .populate('owner', POPULATE_OWNER)
    .lean();
  if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });
  logger.info('[MilestoneService] Milestone updated', { milestoneId: id });
  return milestone;
}

async function deleteMilestone(id) {
  await connectDB();
  await Milestone.findByIdAndDelete(id);
  logger.info('[MilestoneService] Milestone deleted', { milestoneId: id });
}

async function recalcMilestoneProgress(milestoneId) {
  await connectDB();
  const tasks = await Task.find({ milestoneId }).select('status').lean();
  if (tasks.length === 0) return;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completed / tasks.length) * 100);
  const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';
  await Milestone.findByIdAndUpdate(milestoneId, { progress, status });
}

module.exports = { listMilestones, getMilestoneById, createMilestone, updateMilestone, deleteMilestone, recalcMilestoneProgress };
