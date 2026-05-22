const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'task_created', 'task_updated', 'task_deleted', 'task_completed',
      'project_created', 'project_updated', 'project_deleted',
      'member_added', 'member_removed',
      'comment_added', 'file_attached',
      'status_changed', 'priority_changed', 'assigned_changed'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['task', 'project', 'comment', 'file']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);