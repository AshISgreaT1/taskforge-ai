const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getProjectChat,
  sendMessage,
  getMessages,
  addParticipant,
  removeParticipant
} = require('../controllers/chatController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

router.use(protect);

router.get('/:projectId', getProjectChat);
router.get('/:projectId/messages', getMessages);
router.post(
  '/:projectId/messages',
  [
    body('content').optional().trim().isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
    body('messageType').optional().isIn(['text', 'image', 'audio', 'video']).withMessage('Invalid message type'),
    body('mediaUrl').optional().trim().isLength({ max: 500 }).withMessage('Media URL is too long')
  ],
  validate,
  sendMessage
);
router.post(
  '/:projectId/participants',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('role').optional().isIn(['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'])
  ],
  validate,
  addParticipant
);
router.delete('/:projectId/participants/:userId', removeParticipant);

module.exports = router;
