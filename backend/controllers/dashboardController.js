const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const projectFilter = req.user.role === 'admin' ? {} : {
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    };

    const userProjects = await Project.find(projectFilter);

    const projectIds = userProjects.map(p => p._id);

    const allTasks = await Task.find({
      projectId: { $in: projectIds }
    });

    const now = new Date();

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = allTasks.filter(t => t.status === 'todo').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
    const overdueTasks = allTasks.filter(t =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== 'completed'
    ).length;

    const userTaskStats = {};
    allTasks.forEach(task => {
      if (task.assignedTo) {
        const userIdStr = task.assignedTo.toString();
        if (!userTaskStats[userIdStr]) {
          userTaskStats[userIdStr] = { assigned: 0, completed: 0 };
        }
        userTaskStats[userIdStr].assigned++;
        if (task.status === 'completed') {
          userTaskStats[userIdStr].completed++;
        }
      }
    });

    const leaderboard = await User.find().select('name avatar').lean();
    const leaderboardWithStats = leaderboard.map(user => {
      const stats = userTaskStats[user._id.toString()] || { assigned: 0, completed: 0 };
      const productivityScore = stats.assigned > 0
        ? Math.round((stats.completed / stats.assigned) * 100)
        : 0;
      return {
        user: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar
        },
        assignedTasks: stats.assigned,
        completedTasks: stats.completed,
        productivityScore
      };
    }).sort((a, b) => b.productivityScore - a.productivityScore);

    const tasksByPriority = {
      low: allTasks.filter(t => t.priority === 'low').length,
      medium: allTasks.filter(t => t.priority === 'medium').length,
      high: allTasks.filter(t => t.priority === 'high').length,
      critical: allTasks.filter(t => t.priority === 'critical').length
    };

    const tasksByStatus = {
      todo: pendingTasks,
      'in-progress': inProgressTasks,
      'pending-approval': allTasks.filter(t => t.status === 'pending-approval').length,
      completed: completedTasks
    };

    const recentActivity = await Task.find({
      projectId: { $in: projectIds }
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate('assignedTo', 'name avatar')
    .populate('projectId', 'title')
    .select('title status updatedAt projectId');

    res.json({
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        totalProjects: userProjects.length,
        activeProjects: userProjects.filter(p => p.status === 'active').length,
        completedProjects: userProjects.filter(p => p.status === 'completed').length
      },
      tasksByPriority,
      tasksByStatus,
      leaderboard: leaderboardWithStats.slice(0, 10),
      recentActivity,
      overallProductivity: totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
};

exports.getTeamStats = async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId)
      .populate('members.user', 'name avatar email jobRole')
      .populate('createdBy', 'name avatar email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const tasks = await Task.find({ projectId });

    const hasAccess = req.user.role === 'admin' ||
      project.createdBy._id.toString() === req.user.id ||
      project.members.some(member => (member.user?._id || member.user || member).toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    const teamStats = project.members.map(projectMember => {
      const member = projectMember.user || projectMember;
      const memberTasks = tasks.filter(t =>
        t.assignedTo && t.assignedTo.toString() === member._id.toString()
      );
      const completed = memberTasks.filter(t => t.status === 'completed').length;
      const productivity = memberTasks.length > 0
        ? Math.round((completed / memberTasks.length) * 100)
        : 0;

      return {
        member: {
          _id: member._id,
          name: member.name,
          avatar: member.avatar,
          email: member.email
        },
        totalAssigned: memberTasks.length,
        completed,
        inProgress: memberTasks.filter(t => t.status === 'in-progress').length,
        todo: memberTasks.filter(t => t.status === 'todo').length,
        overdue: memberTasks.filter(t =>
          t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          t.status !== 'completed'
        ).length,
        productivity
      };
    });

    const ownerTasks = tasks.filter(t =>
      t.createdBy && t.createdBy.toString() === project.createdBy._id.toString()
    );
    const ownerCompleted = ownerTasks.filter(t => t.status === 'completed').length;
    const ownerProductivity = ownerTasks.length > 0
      ? Math.round((ownerCompleted / ownerTasks.length) * 100)
      : 0;

    teamStats.unshift({
      member: {
        _id: project.createdBy._id,
        name: project.createdBy.name,
        avatar: project.createdBy.avatar,
        email: project.createdBy.email
      },
      totalAssigned: ownerTasks.length,
      completed: ownerCompleted,
      inProgress: ownerTasks.filter(t => t.status === 'in-progress').length,
      todo: ownerTasks.filter(t => t.status === 'todo').length,
      overdue: ownerTasks.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== 'completed'
      ).length,
      productivity: ownerProductivity,
      isOwner: true
    });

    res.json({
      success: true,
      project: {
        _id: project._id,
        title: project.title,
        progress: project.progress
      },
      teamStats: teamStats.sort((a, b) => b.productivity - a.productivity)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team stats',
      error: error.message
    });
  }
};
