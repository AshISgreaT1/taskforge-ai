const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboard, getTeamStats } = require('../controllers/dashboardController');

router.use(protect);

router.get('/', getDashboard);
router.get('/team', getTeamStats);

module.exports = router;