const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');

const canAccessTask = async (task, user) => {
  if (user.role === 'admin') return true;

  const project = await Project.findById(task.projectId).select('createdBy members');
  if (!project) return false;

  return project.createdBy.toString() === user.id ||
    project.members.some(member => (member.user?._id || member.user || member).toString() === user.id);
};

exports.getComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!(await canAccessTask(task, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access comments for this task'
      });
    }

    const comments = await Comment.find({ taskId })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content, mentions } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!(await canAccessTask(task, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task'
      });
    }

    const comment = await Comment.create({
      content,
      taskId,
      author: req.user.id,
      mentions: mentions || []
    });

    await comment.populate('author', 'name email avatar');
    await comment.populate('mentions', 'name email avatar');

    await ActivityLog.create({
      user: req.user.id,
      action: 'comment_added',
      entityType: 'comment',
      entityId: comment._id,
      details: { taskId, content: content.substring(0, 100) },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error.message
    });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    const task = await Task.findById(comment.taskId);
    if (!task || !(await canAccessTask(task, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    await comment.populate('author', 'name email avatar');
    await comment.populate('mentions', 'name email avatar');

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    const task = await Task.findById(comment.taskId);
    if (!task || !(await canAccessTask(task, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await comment.deleteOne();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
};
