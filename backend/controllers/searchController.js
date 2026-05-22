const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

exports.globalSearch = async (req, res) => {
  try {
    const { q, type, projectId, status, priority, assignedTo } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const query = new RegExp(q, 'i');
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let projectIds = [];

    if (projectId) {
      projectIds = [projectId];
    } else if (!isAdmin) {
      const userProjects = await Project.find({
        $or: [{ createdBy: userId }, { 'members.user': userId }]
      }).select('_id');
      projectIds = userProjects.map(p => p._id);
    }

    const results = {
      tasks: [],
      projects: [],
      users: []
    };

    if (!type || type === 'task') {
      const taskFilter = {
        $or: [
          { title: query },
          { description: query }
        ]
      };

      if (projectIds.length > 0) {
        taskFilter.projectId = { $in: projectIds };
      }
      if (status) taskFilter.status = status;
      if (priority) taskFilter.priority = priority;
      if (assignedTo) taskFilter.assignedTo = assignedTo;

      const tasks = await Task.find(taskFilter)
        .populate('assignedTo', 'name email avatar')
        .populate('projectId', 'title')
        .limit(20);

      results.tasks = tasks;
    }

    if (!type || type === 'project') {
      const searchFilter = {
        $or: [
          { title: query },
          { description: query }
        ]
      };

      let projectFilter = searchFilter;
      if (!isAdmin) {
        projectFilter = {
          $and: [
            searchFilter,
            {
              $or: [
                { createdBy: userId },
                { 'members.user': userId }
              ]
            }
          ]
        };
      }

      const projects = await Project.find(projectFilter)
        .populate('members.user', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .limit(10);

      results.projects = projects;
    }

    if (!type || type === 'user') {
      const userFilter = {
        $or: [
          { name: query },
          { email: query }
        ]
      };

      const users = await User.find(userFilter)
        .select('name email avatar role')
        .limit(10);

      results.users = users;
    }

    res.json({
      success: true,
      results,
      query: q
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
};

exports.searchTasks = async (req, res) => {
  try {
    const { q, projectId, status, priority, assignedTo, dueBefore, dueAfter } = req.query;

    const filter = {};
    const userId = req.user.id;

    if (req.user.role !== 'admin') {
      const userProjects = await Project.find({
        $or: [{ createdBy: userId }, { 'members.user': userId }]
      }).select('_id');
      filter.projectId = { $in: userProjects.map(project => project._id) };
    }

    if (q) {
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') }
      ];
    }

    if (projectId) {
      if (filter.projectId?.$in && !filter.projectId.$in.some(id => id.toString() === projectId)) {
        return res.json({
          success: true,
          tasks: [],
          total: 0
        });
      }
      filter.projectId = projectId;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (dueBefore || dueAfter) {
      filter.dueDate = {};
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
      if (dueAfter) filter.dueDate.$gte = new Date(dueAfter);
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks,
      total: tasks.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error searching tasks',
      error: error.message
    });
  }
};

exports.getFilters = async (req, res) => {
  try {
    const { projectId } = req.query;

    const filter = {};
    let projectFilter = {};
    if (projectId) filter.projectId = projectId;

    if (req.user.role !== 'admin') {
      const userProjects = await Project.find({
        $or: [{ createdBy: req.user.id }, { 'members.user': req.user.id }]
      }).select('_id title');
      const projectIds = userProjects.map(project => project._id);

      if (projectId && !projectIds.some(id => id.toString() === projectId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access filters for this project'
        });
      }

      filter.projectId = projectId || { $in: projectIds };
      projectFilter = { _id: { $in: projectIds } };
    }

    const statuses = await Task.distinct('status', filter);
    const priorities = await Task.distinct('priority', filter);
    const users = await User.find().select('name email avatar role');
    const projects = await Project.find(projectFilter).select('title');

    res.json({
      success: true,
      filters: {
        statuses: statuses.sort(),
        priorities: priorities.sort(),
        users,
        projects
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching filters',
      error: error.message
    });
  }
};
