const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole
} = require('../controllers/projectController');

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

router
  .route('/')
  .get(getProjects)
  .post(
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('description').optional().trim()
    ],
    validate,
    createProject
  );

router
  .route('/:id')
  .get(getProject)
  .put(
    [
      body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
      body('description').optional().trim()
    ],
    validate,
    updateProject
  )
  .delete(deleteProject);

router.post(
  '/:id/members',
  [
    body('memberId').notEmpty().withMessage('Member ID is required'),
    body('role').optional().isIn(['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'])
  ],
  validate,
  addMember
);

router.patch(
  '/:id/members/:memberId',
  [
    body('role').isIn(['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member']).withMessage('Valid role is required')
  ],
  validate,
  updateMemberRole
);

router.delete(
  '/:id/members',
  [
    body('memberId').notEmpty().withMessage('Member ID is required')
  ],
  validate,
  removeMember
);

module.exports = router;
