const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getAIPrediction,
  getPendingApprovals,
  approveTask,
  rejectTask
} = require('../controllers/taskController');

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

router.get('/approvals/pending', getPendingApprovals);

router
  .route('/')
  .get(getTasks)
  .post(
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('projectId').notEmpty().withMessage('Project ID is required'),
      body('description').optional().trim(),
      body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
      body('generateSubtasks').optional().isBoolean()
    ],
    validate,
    createTask
  );

router
  .route('/:id')
  .get(getTask)
  .put(
    [
      body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
      body('description').optional().trim(),
      body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
      body('status').optional().isIn(['todo', 'in-progress', 'pending-approval', 'completed'])
    ],
    validate,
    updateTask
  )
  .delete(deleteTask);

router.patch(
  '/:id/status',
  [
    body('status').isIn(['todo', 'in-progress', 'pending-approval', 'completed']).withMessage('Valid status is required')
  ],
  validate,
  updateTaskStatus
);

router.post(
  '/:id/approve',
  [
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters')
  ],
  validate,
  approveTask
);

router.post(
  '/:id/reject',
  [
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters')
  ],
  validate,
  rejectTask
);

router.get('/ai/prediction/:projectId', getAIPrediction);

module.exports = router;
