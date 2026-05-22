const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'audio', 'video'],
    default: 'text'
  },
  mediaUrl: {
    type: String
  },
  attachments: [{
    type: String
  }]
}, { timestamps: true });

const projectChatSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [messageSchema],
  lastMessage: {
    type: messageSchema
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

projectChatSchema.index({ projectId: 1 });
projectChatSchema.index({ participants: 1 });

module.exports = mongoose.model('ProjectChat', projectChatSchema);