const Project = require('../models/Project');
const Task = require('../models/Task');
const notificationController = require('./notificationController');

const PROJECT_ROLES = ['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'];

const memberUserId = (member) => (member.user?._id || member.user || member._id || member).toString();

const normalizeMembers = (members = [], addedBy) => members.map(member => {
  if (typeof member === 'string') {
    return { user: member, role: 'member', addedBy };
  }

  return {
    user: member.user || member._id || member,
    role: PROJECT_ROLES.includes(member.role) ? member.role : 'member',
    addedBy
  };
});

exports.getProjects = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : {
      $or: [
        { createdBy: req.user.id },
        { 'members.user': req.user.id }
      ]
    };

    const projects = await Project.find(filter)
    .populate('members.user', 'name email avatar role jobRole')
    .populate('createdBy', 'name email avatar')
    .sort({ updatedAt: -1 });

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email avatar role jobRole')
      .populate('createdBy', 'name email avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const hasAccess = project.createdBy._id.toString() === req.user.id ||
      project.members.some(member => memberUserId(member) === req.user.id);

    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    const tasks = await Task.find({ projectId: project._id })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      project,
      tasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, description, members, endDate } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create projects'
      });
    }

    const project = await Project.create({
      title,
      description,
      members: normalizeMembers(members || [], req.user.id),
      createdBy: req.user.id,
      endDate
    });

    await project.populate('members.user', 'name email avatar role jobRole');
    await project.populate('createdBy', 'name email avatar');

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error.message
    });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, description, members, status, endDate } = req.body;

    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update projects'
      });
    }

    const updates = { title, description, status, endDate };
    if (members) updates.members = normalizeMembers(members, req.user.id);

    project = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('members.user', 'name email avatar role jobRole')
    .populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete projects'
      });
    }

    await Task.deleteMany({ projectId: req.params.id });
    await project.deleteOne();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { memberId, role = 'member' } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add members'
      });
    }

    if (!PROJECT_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project role'
      });
    }

    if (project.members.some(member => memberUserId(member) === memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member'
      });
    }

    project.members.push({ user: memberId, role, addedBy: req.user.id });
    await project.save();

    await notificationController.createNotification({
      recipient: memberId,
      sender: req.user.id,
      type: 'member_added',
      title: 'Added to Project',
      message: `You have been added to project "${project.title}"`,
      projectId: project._id
    });

    await project.populate('members.user', 'name email avatar role jobRole');
    await project.populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error adding member',
      error: error.message
    });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { memberId } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members'
      });
    }

    project.members = project.members.filter(
      member => memberUserId(member) !== memberId
    );
    await project.save();

    await notificationController.createNotification({
      recipient: memberId,
      sender: req.user.id,
      type: 'member_removed',
      title: 'Removed from Project',
      message: `You have been removed from project "${project.title}"`,
      projectId: project._id
    });

    await project.populate('members.user', 'name email avatar role jobRole');
    await project.populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change member roles'
      });
    }

    if (!PROJECT_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project role'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const member = project.members.find(item => memberUserId(item) === memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Project member not found'
      });
    }

    member.role = role;
    await project.save();

    await project.populate('members.user', 'name email avatar role jobRole');
    await project.populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating member role',
      error: error.message
    });
  }
};
