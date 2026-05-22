const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getComments,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');

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
  .route('/task/:taskId')
  .get(getComments)
  .post(
    [
      body('content').trim().notEmpty().withMessage('Content is required'),
      body('mentions').optional().isArray()
    ],
    validate,
    createComment
  );

router
  .route('/:id')
  .put(
    [
      body('content').trim().notEmpty().withMessage('Content is required')
    ],
    validate,
    updateComment
  )
  .delete(deleteComment);

module.exports = router;