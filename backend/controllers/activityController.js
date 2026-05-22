const ActivityLog = require('../models/ActivityLog');
const Project = require('../models/Project');
const Task = require('../models/Task');

const hasProjectAccess = (project, user) => {
  if (user.role === 'admin') return true;
  return project.createdBy.toString() === user.id ||
    project.members.some(member => (member.user?._id || member.user || member).toString() === user.id);
};

exports.getActivityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view activity logs'
      });
    }

    const { entityType, entityId, userId, limit = 50 } = req.query;

    const filter = {};
    if (entityType && entityId) {
      filter.entityType = entityType;
      filter.entityId = entityId;
    }
    if (userId) {
      filter.user = userId;
    }

    const logs = await ActivityLog.find(filter)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message
    });
  }
};

exports.getProjectActivity = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50 } = req.query;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project activity'
      });
    }

    const tasks = await Task.find({ projectId }).select('_id');
    const taskIds = tasks.map(t => t._id);

    const logs = await ActivityLog.find({
      $or: [
        { entityType: 'project', entityId: projectId },
        { entityType: 'task', entityId: { $in: taskIds } }
      ]
    })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project activity',
      error: error.message
    });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, userId, action, limit = 100 } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (userId) filter.user = userId;
    if (action) filter.action = action;

    const logs = await ActivityLog.find(filter)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
};

exports.getActivityStats = async (req, res) => {
  try {
    const { projectId, days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let filter = { createdAt: { $gte: startDate } };

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (!hasProjectAccess(project, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project activity'
        });
      }

      const tasks = await Task.find({ projectId }).select('_id');
      const taskIds = tasks.map(t => t._id);
      filter.$or = [
        { entityType: 'project', entityId: projectId },
        { entityType: 'task', entityId: { $in: taskIds } }
      ];
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view global activity stats'
      });
    }

    const stats = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            action: '$action',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);

    const activityByDate = {};
    const activityByAction = {};

    stats.forEach(s => {
      const date = s._id.date;
      const action = s._id.action;

      if (!activityByDate[date]) activityByDate[date] = 0;
      activityByDate[date] += s.count;

      if (!activityByAction[action]) activityByAction[action] = 0;
      activityByAction[action] += s.count;
    });

    res.json({
      success: true,
      stats: {
        byDate: activityByDate,
        byAction: activityByAction,
        total: stats.reduce((sum, s) => sum + s.count, 0)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity stats',
      error: error.message
    });
  }
};
