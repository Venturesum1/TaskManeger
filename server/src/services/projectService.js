const Project = require('../models/Project');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const { connectDB } = require('../database/mongodb');
const logger = require('../utils/logger');

const POPULATE_USER = 'name email avatar department';

async function listProjects(filters = {}) {
  await connectDB();
  const query = {};
  if (filters.status && filters.status !== 'all') query.status = filters.status;
  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

  const projects = await Project.find(query)
    .populate('teamMembers', POPULATE_USER)
    .populate('clientId', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Attach task count and milestone count
  const enriched = await Promise.all(projects.map(async (p) => {
    const [taskCount, milestoneCount] = await Promise.all([
      Task.countDocuments({ projectId: p._id }),
      Milestone.countDocuments({ projectId: p._id }),
    ]);
    return { ...p, taskCount, milestoneCount };
  }));

  return enriched;
}

async function getProjectById(id) {
  await connectDB();
  return Project.findById(id)
    .populate('teamMembers', POPULATE_USER)
    .populate('clientId', 'name email')
    .populate('createdBy', 'name email')
    .lean();
}

async function createProject({ name, description, clientId, status, startDate, endDate, teamMembers, createdBy }) {
  await connectDB();
  if (!name?.trim()) throw Object.assign(new Error('Project name is required'), { statusCode: 400 });

  const project = await Project.create({
    name: name.trim(),
    description: description || '',
    clientId: clientId || undefined,
    status: status || 'planning',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    teamMembers: teamMembers || [],
    createdBy,
  });

  const populated = await project.populate([
    { path: 'teamMembers', select: POPULATE_USER },
    { path: 'clientId', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);

  logger.info('[ProjectService] Project created', { projectId: project._id, name: project.name });
  return populated;
}

async function updateProject(id, updates) {
  await connectDB();
  const project = await Project.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate('teamMembers', POPULATE_USER)
    .populate('clientId', 'name email')
    .populate('createdBy', 'name email')
    .lean();
  if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  logger.info('[ProjectService] Project updated', { projectId: id });
  return project;
}

async function deleteProject(id) {
  await connectDB();
  await Project.findByIdAndDelete(id);
  logger.info('[ProjectService] Project deleted', { projectId: id });
}

async function recalcProgress(projectId) {
  await connectDB();
  const tasks = await Task.find({ projectId }).select('status').lean();
  if (tasks.length === 0) return;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completed / tasks.length) * 100);
  await Project.findByIdAndUpdate(projectId, { progress });
}

async function getProjectStats(id) {
  await connectDB();
  const [project, tasks, milestones] = await Promise.all([
    Project.findById(id).populate('teamMembers', POPULATE_USER).populate('clientId', 'name email').lean(),
    Task.find({ projectId: id }).populate('owner', 'name email avatar').lean(),
    Milestone.find({ projectId: id }).populate('owner', 'name email').lean(),
  ]);
  if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  const now = new Date();
  const openTasks = tasks.filter(t => t.status !== 'completed').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => t.endDate && new Date(t.endDate) < now && t.status !== 'completed').length;
  const upcomingMilestones = milestones.filter(m => m.status !== 'completed').sort((a, b) =>
    new Date(a.endDate || 0) - new Date(b.endDate || 0)
  ).slice(0, 3);

  // Project health
  let health = 'healthy';
  if (overdueTasks > 0 || milestones.some(m => m.status === 'delayed')) health = 'at_risk';
  if (project.endDate && new Date(project.endDate) < now && project.status !== 'completed') health = 'delayed';

  return {
    project,
    stats: { openTasks, completedTasks, overdueTasks, totalTasks: tasks.length, totalMilestones: milestones.length },
    milestones,
    upcomingMilestones,
    tasks,
    health,
  };
}

module.exports = { listProjects, getProjectById, createProject, updateProject, deleteProject, recalcProgress, getProjectStats };
