const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getActivityLogs,
  getProjectActivity,
  getAuditLogs,
  getActivityStats
} = require('../controllers/activityController');

router.use(protect);

router.get('/', getActivityLogs);
router.get('/project/:projectId', getProjectActivity);

router.get(
  '/audit',
  authorize('admin'),
  getAuditLogs
);

router.get('/stats', getActivityStats);

module.exports = router;