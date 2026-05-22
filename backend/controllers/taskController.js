const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const notificationController = require('./notificationController');

const aiSubtasks = {
  'build landing page': [
    'Design UI mockup',
    'Create navbar component',
    'Build hero section',
    'Implement responsive layout',
    'Add footer section',
    'Test cross-browser compatibility',
    'Optimize images and assets'
  ],
  'build website': [
    'Design homepage layout',
    'Create navigation system',
    'Build content pages',
    'Implement contact forms',
    'Add responsive design',
    'Test and fix bugs',
    'Deploy to production'
  ],
  'build app': [
    'Design app architecture',
    'Create UI components',
    'Implement core features',
    'Add user authentication',
    'Build database integration',
    'Test functionality',
    'Deploy mobile app'
  ],
  'create landing page': [
    'Wireframe design',
    'Build HTML structure',
    'Style with CSS',
    'Add interactive elements',
    'Test responsiveness',
    'Optimize performance'
  ],
  'build dashboard': [
    'Design dashboard layout',
    'Create sidebar navigation',
    'Build data visualization',
    'Add user widgets',
    'Implement real-time updates',
    'Test and validate'
  ],
  'implement authentication': [
    'Design login/signup forms',
    'Set up JWT tokens',
    'Create password reset flow',
    'Add social login',
    'Implement session management',
    'Security testing'
  ],
  'default': [
    'Research and planning',
    'Design phase',
    'Implementation',
    'Testing',
    'Review and refinement',
    'Deployment'
  ]
};

function generateSubtasks(mainTaskTitle) {
  const titleLower = mainTaskTitle.toLowerCase();
  let subtasks = [];

  for (const [key, value] of Object.entries(aiSubtasks)) {
    if (titleLower.includes(key)) {
      subtasks = value;
      break;
    }
  }

  if (subtasks.length === 0) {
    subtasks = aiSubtasks.default;
  }

  return subtasks;
}

function predictDelay(project, tasks) {
  const now = new Date();
  const endDate = project.endDate ? new Date(project.endDate) : null;

  if (!endDate) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
  ).length;

  if (totalTasks === 0 || completedTasks === totalTasks) return null;

  const progressRatio = completedTasks / totalTasks;
  const timeElapsed = (now - new Date(project.createdAt)) / (endDate - new Date(project.createdAt));

  const timeRemaining = endDate - now;
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

  const tasksRemaining = totalTasks - completedTasks;
  const avgTasksPerDay = completedTasks / Math.max(1, (now - new Date(project.createdAt)) / (1000 * 60 * 60 * 24));

  const predictedDaysNeeded = avgTasksPerDay > 0 ? tasksRemaining / avgTasksPerDay : tasksRemaining * 2;

  if (predictedDaysNeeded > daysRemaining && overdueTasks > 0) {
    const delayDays = Math.ceil(predictedDaysNeeded - daysRemaining);
    return `This project may be delayed by ${delayDays} day${delayDays > 1 ? 's' : ''}`;
  }

  if (overdueTasks > totalTasks * 0.3) {
    return 'This project has significant overdue tasks';
  }

  return null;
}

exports.getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;

    const filter = {};

    let allowedProjectIds = null;

    if (req.user.role !== 'admin') {
      const userProjects = await Project.find({
        $or: [
          { createdBy: req.user.id },
          { 'members.user': req.user.id }
        ]
      }).select('_id');

      allowedProjectIds = userProjects.map(project => project._id.toString());
      filter.projectId = { $in: allowedProjectIds };
    }

    if (projectId) {
      if (allowedProjectIds && !allowedProjectIds.includes(projectId)) {
        return res.json({
          success: true,
          tasks: []
        });
      }
      filter.projectId = projectId;
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'title description members')
      .populate('parentTask', 'title status');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const hasAccess = await canAccessTask(task, req.user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    const subtasks = await Task.find({ parentTask: task._id })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      task,
      subtasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate, projectId, generateSubtasks: generateAI } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create and assign tasks'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const mainTask = await Task.create({
      title,
      description,
      assignedTo,
      priority: priority || 'medium',
      status: 'todo',
      dueDate,
      projectId,
      createdBy: req.user.id
    });

    let subtasks = [];
    if (generateAI) {
      const subtaskTitles = generateSubtasks(title);
      for (const subtaskTitle of subtaskTitles) {
        const subtask = await Task.create({
          title: subtaskTitle,
          description: `Subtask of: ${title}`,
          assignedTo,
          priority: priority || 'medium',
          status: 'todo',
          dueDate,
          projectId,
          createdBy: req.user.id,
          isSubtask: true,
          parentTask: mainTask._id
        });
        subtasks.push(subtask);
      }
    }

    const task = await Task.findById(mainTask._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'title');

    await updateProjectProgress(projectId);

    if (assignedTo) {
      await notificationController.createNotification({
        recipient: assignedTo,
        sender: req.user.id,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned "${task.title}"`,
        projectId,
        taskId: task._id
      });
    }

    res.status(201).json({
      success: true,
      task,
      subtasks,
      aiGenerated: generateAI ? subtasks.length > 0 : false
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate, status } = req.body;

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can edit tasks'
      });
    }
    const previousAssignedTo = task.assignedTo?.toString();

    if (status) {
      const allowed = getAllowedNextStatuses(task, req.user);
      if (!allowed.includes(status)) {
        return res.status(403).json({
          success: false,
          message: `Cannot move task from ${task.status} to ${status}`
        });
      }
    }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      normalizeTaskUpdate({ title, description, assignedTo, priority, dueDate, status }, task, req.user),
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('projectId', 'title');

    await updateProjectProgress(task.projectId);

    if (assignedTo && assignedTo !== previousAssignedTo) {
      await notificationController.createNotification({
        recipient: assignedTo,
        sender: req.user.id,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned "${task.title}"`,
        projectId: task.projectId,
        taskId: task._id
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const hasAccess = await canAccessTask(task, req.user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const allowed = getAllowedNextStatuses(task, req.user);
    if (!allowed.includes(status)) {
      return res.status(403).json({
        success: false,
        message: `Cannot move task from ${task.status} to ${status}`
      });
    }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      normalizeTaskUpdate({ status }, task, req.user),
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('projectId', 'title');

    await updateProjectProgress(task.projectId);

    if (status === 'pending-approval') {
      await notifyAdmins({
        sender: req.user.id,
        type: 'task_completed',
        title: 'Task Pending Approval',
        message: `"${task.title}" is ready for admin approval`,
        projectId: task.projectId,
        taskId: task._id
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: error.message
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete tasks'
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.deleteMany({ parentTask: req.params.id });
    await task.deleteOne();

    await updateProjectProgress(task.projectId);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view approvals'
      });
    }

    const tasks = await Task.find({
      status: 'pending-approval',
      approvalStatus: 'pending'
    })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'title')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approvals',
      error: error.message
    });
  }
};

exports.approveTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can approve tasks'
      });
    }

    const { note } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.status !== 'pending-approval') {
      return res.status(400).json({
        success: false,
        message: 'Only pending approval tasks can be approved'
      });
    }

    task.status = 'completed';
    task.approvalStatus = 'approved';
    task.approvalNote = note || '';
    task.approvedBy = req.user.id;
    task.completedAt = Date.now();
    await task.save();

    await updateProjectProgress(task.projectId);
    await notifyTaskUser(task, req.user.id, 'task_approved', 'Approval Accepted', `"${task.title}" was approved`);

    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('projectId', 'title');
    await task.populate('approvedBy', 'name email avatar');

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error approving task',
      error: error.message
    });
  }
};

exports.rejectTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reject tasks'
      });
    }

    const { note } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.status !== 'pending-approval') {
      return res.status(400).json({
        success: false,
        message: 'Only pending approval tasks can be rejected'
      });
    }

    task.status = 'in-progress';
    task.approvalStatus = 'rejected';
    task.approvalNote = note || '';
    task.approvedBy = req.user.id;
    task.completedAt = undefined;
    await task.save();

    await updateProjectProgress(task.projectId);
    await notifyTaskUser(task, req.user.id, 'task_rejected', 'Approval Rejected', `"${task.title}" was sent back to In Progress`);

    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('projectId', 'title');
    await task.populate('approvedBy', 'name email avatar');

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting task',
      error: error.message
    });
  }
};

exports.getAIPrediction = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role !== 'admin') {
      const hasAccess = project.createdBy.toString() === req.user.id ||
        project.members.some(member => (member.user?._id || member.user || member).toString() === req.user.id);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project'
        });
      }
    }

    const tasks = await Task.find({ projectId });
    const prediction = predictDelay(project, tasks);

    res.json({
      success: true,
      prediction,
      projectId,
      taskCount: tasks.length,
      completedCount: tasks.filter(t => t.status === 'completed').length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error getting AI prediction',
      error: error.message
    });
  }
};

async function updateProjectProgress(projectId) {
  const tasks = await Task.find({ projectId });
  if (tasks.length === 0) {
    await Project.findByIdAndUpdate(projectId, { progress: 0 });
    return;
  }
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progress = Math.round((completedTasks / tasks.length) * 100);
  await Project.findByIdAndUpdate(projectId, { progress });

  if (progress === 100) {
    await Project.findByIdAndUpdate(projectId, { status: 'completed' });
  }
}

async function canAccessTask(task, user) {
  if (user.role === 'admin') return true;

  const project = await Project.findById(task.projectId).select('createdBy members');
  if (!project) return false;

  return project.createdBy.toString() === user.id ||
    project.members.some(member => (member.user?._id || member.user || member).toString() === user.id);
}

function normalizeTaskUpdate(updates, task, user) {
  const payload = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) payload[key] = value;
  });

  if (payload.status) {
    if (payload.status === 'pending-approval') {
      payload.approvalStatus = 'pending';
      payload.approvalNote = '';
      payload.approvedBy = undefined;
      payload.completedAt = undefined;
    }

    if (payload.status === 'completed' && user.role !== 'admin') {
      payload.status = task.status;
    }

    if (payload.status === 'completed') {
      payload.approvalStatus = 'approved';
      payload.approvedBy = user.id;
      payload.completedAt = Date.now();
    }

    if (payload.status !== 'completed') {
      payload.completedAt = undefined;
    }
  }

  return payload;
}

function getAllowedNextStatuses(task, user) {
  const isAdmin = user.role === 'admin';
  const isAssigned = task.assignedTo?.toString() === user.id;
  const isCreator = task.createdBy?.toString() === user.id;

  if (!isAdmin && !isAssigned && !isCreator) return [];
  if (task.status === 'todo') return ['in-progress'];
  if (task.status === 'in-progress') return ['pending-approval'];
  if (task.status === 'pending-approval') return ['pending-approval'];
  return ['completed'];
}

async function notifyAdmins(data) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  for (const admin of admins) {
    if (admin._id.toString() !== data.sender) {
      await notificationController.createNotification({
        ...data,
        recipient: admin._id
      });
    }
  }
}

async function notifyTaskUser(task, sender, type, title, message) {
  const recipients = new Set();
  if (task.assignedTo) recipients.add(task.assignedTo.toString());
  if (task.createdBy) recipients.add(task.createdBy.toString());

  for (const recipient of recipients) {
    if (recipient !== sender) {
      await notificationController.createNotification({
        recipient,
        sender,
        type,
        title,
        message,
        projectId: task.projectId,
        taskId: task._id
      });
    }
  }
}
