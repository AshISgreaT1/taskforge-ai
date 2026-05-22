const FileAttachment = require('../models/FileAttachment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const memberUserId = (member) => (member.user?._id || member.user || member._id || member).toString();

const canAccessProject = (project, user) => {
  if (user.role === 'admin') return true;
  return project.createdBy.toString() === user.id ||
    project.members.some(member => memberUserId(member) === user.id);
};

const resolveFileProject = async ({ taskId, projectId }) => {
  if (taskId) {
    const task = await Task.findById(taskId);
    if (!task) return null;
    return Project.findById(task.projectId);
  }

  return Project.findById(projectId);
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { taskId, projectId } = req.body;

    if (!taskId && !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID or Project ID is required'
      });
    }

    const project = await resolveFileProject({ taskId, projectId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project or task not found'
      });
    }

    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload files for this project'
      });
    }

    const file = await FileAttachment.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      taskId: taskId || null,
      projectId: projectId || null,
      uploadedBy: req.user.id
    });

    await file.populate('uploadedBy', 'name email avatar');

    const entityType = taskId ? 'task' : 'project';
    const entityId = taskId || projectId;

    await ActivityLog.create({
      user: req.user.id,
      action: 'file_attached',
      entityType: 'file',
      entityId: file._id,
      details: { originalName: req.file.originalname, entityType, entityId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      file
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { taskId, projectId } = req.query;

    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (projectId) filter.projectId = projectId;

    if (taskId || projectId) {
      const project = await resolveFileProject({ taskId, projectId });
      if (!project || !canAccessProject(project, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access these files'
        });
      }
    } else if (req.user.role !== 'admin') {
      const projects = await Project.find({
        $or: [
          { createdBy: req.user.id },
          { 'members.user': req.user.id }
        ]
      }).select('_id');
      filter.projectId = { $in: projects.map(project => project._id) };
    }

    const files = await FileAttachment.find(filter)
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await FileAttachment.findById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const project = await resolveFileProject({ taskId: file.taskId, projectId: file.projectId });
    if (!project || !canAccessProject(project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this file'
      });
    }

    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file'
      });
    }

    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await file.deleteOne();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await FileAttachment.findById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
};
