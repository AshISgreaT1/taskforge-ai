const ProjectChat = require('../models/ProjectChat');
const Project = require('../models/Project');
const notificationController = require('./notificationController');

const hasProjectAccess = (project, user) => {
  const isOwner = project.createdBy.toString() === user.id;
  const isAdmin = user.role === 'admin';
  const isMember = project.members.some(
    m => (m.user?._id || m.user || m).toString() === user.id
  );

  return isOwner || isAdmin || isMember;
};

exports.getProjectChat = async (req, res) => {
  try {
    const { projectId } = req.params;

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
        message: 'You are not a member of this project'
      });
    }

    let chat = await ProjectChat.findOne({ projectId })
      .populate('participants', 'name avatar jobRole')
      .populate('messages.sender', 'name avatar');

    if (!chat) {
      chat = await ProjectChat.create({
        projectId,
        participants: [req.user.id],
        messages: []
      });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Get project chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project chat'
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content, messageType, mediaUrl } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message content or media is required'
      });
    }

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
        message: 'You are not a member of this project'
      });
    }

    let chat = await ProjectChat.findOne({ projectId });

    if (!chat) {
      chat = await ProjectChat.create({
        projectId,
        participants: [req.user.id],
        messages: []
      });
    }

    const message = {
      sender: req.user.id,
      content,
      messageType: messageType || 'text',
      mediaUrl
    };

    chat.messages.push(message);
    chat.lastMessage = message;
    chat.lastActivity = Date.now();

    await chat.save();
    await chat.populate('messages.sender', 'name avatar');

    const participantIds = [
      project.createdBy.toString(),
      ...project.members.map(m => (m.user?._id || m.user || m).toString())
    ];
    const otherParticipants = participantIds.filter(id => id !== req.user.id);

    for (const recipientId of otherParticipants) {
      await notificationController.createNotification({
        recipient: recipientId,
        sender: req.user.id,
        type: 'new_message',
        title: 'New Chat Message',
        message: `${req.user.name} sent a message in ${project.title}`,
        projectId
      });
    }

    res.json({
      success: true,
      message: chat.messages[chat.messages.length - 1]
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, before } = req.query;

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
        message: 'You are not a member of this project'
      });
    }

    const chat = await ProjectChat.findOne({ projectId })
      .populate('messages.sender', 'name avatar');

    if (!chat) {
      return res.json({
        success: true,
        messages: []
      });
    }

    let messages = chat.messages;
    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter(m => m.createdAt < beforeDate);
    }

    messages = messages.slice(-parseInt(limit));

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};

exports.addParticipant = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;

    const project = await Project.findById(projectId);
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

    let chat = await ProjectChat.findOne({ projectId });

    if (!chat) {
      chat = await ProjectChat.create({
        projectId,
        participants: [],
        messages: []
      });
    }

    const isProjectMember = project.createdBy.toString() === userId ||
      project.members.some(m => (m.user?._id || m.user || m).toString() === userId);

    if (!isProjectMember) {
      return res.status(403).json({
        success: false,
        message: 'Only project members can be added to project chat'
      });
    }

    if (!chat.participants.includes(userId)) {
      chat.participants.push(userId);
      await chat.save();
    }

    await notificationController.createNotification({
      recipient: userId,
      sender: req.user.id,
      type: 'member_added',
      title: 'Added to Project',
      message: `You have been added to project "${project.title}"`,
      projectId
    });

    res.json({
      success: true,
      message: 'Participant added successfully'
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding participant'
    });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
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

    let chat = await ProjectChat.findOne({ projectId });

    if (chat) {
      chat.participants = chat.participants.filter(
        p => p.toString() !== userId
      );
      await chat.save();
    }

    await notificationController.createNotification({
      recipient: userId,
      sender: req.user.id,
      type: 'member_removed',
      title: 'Removed from Project',
      message: `You have been removed from project "${project.title}"`,
      projectId
    });

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing participant'
    });
  }
};
