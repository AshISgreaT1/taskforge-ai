const Project = require('../models/Project');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to perform this action`
      });
    }
    next();
  };
};

const checkProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const isOwner = project.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isMember = project.members.some(
      m => (m.user?._id || m.user || m).toString() === req.user.id
    );

    req.project = project;
    req.isOwner = isOwner;
    req.isAdmin = isAdmin;
    req.isMember = isMember;
    req.canManage = isOwner || isAdmin;

    if (!isOwner && !isAdmin && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    next();
  } catch (error) {
    console.error('Check project access error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking project access'
    });
  }
};

const checkTaskOwnership = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const Task = require('../models/Task');

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const isOwner = task.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isAssigned = task.assignedTo?.toString() === req.user.id;

    req.task = task;
    req.isTaskOwner = isOwner;
    req.isTaskAdmin = isAdmin;
    req.isAssignedUser = isAssigned;

    if (req.user.role === 'member' && !isAssigned && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your assigned tasks'
      });
    }

    next();
  } catch (error) {
    console.error('Check task ownership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking task ownership'
    });
  }
};

module.exports = {
  authorize,
  checkProjectAccess,
  checkTaskOwnership
};
