const projectService = require('../services/projectService');
const activityService = require('../services/activityService');
const { success, created, fail, notFound, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const projects = await projectService.listProjects(req.query);
    return success(res, projects);
  } catch (err) {
    return serverError(res, err);
  }
}

async function getOne(req, res) {
  try {
    const data = await projectService.getProjectStats(req.params.id);
    return success(res, data);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Project');
    return serverError(res, err);
  }
}

async function create(req, res) {
  try {
    const project = await projectService.createProject({ ...req.body, createdBy: req.auth.userId });
    activityService.log({
      userId: req.auth.userId,
      action: 'created project',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
    });
    return created(res, project);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    activityService.log({
      userId: req.auth.userId,
      action: 'updated project',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
    });
    return success(res, project);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Project');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    const project = await projectService.getProjectById(req.params.id);
    await projectService.deleteProject(req.params.id);
    activityService.log({
      userId: req.auth.userId,
      action: 'deleted project',
      entityType: 'project',
      entityId: req.params.id,
      entityTitle: project?.name || '',
    });
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, getOne, create, update, remove };
