const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  globalSearch,
  searchTasks,
  getFilters
} = require('../controllers/searchController');

router.use(protect);

router.get('/', globalSearch);
router.get('/tasks', searchTasks);
router.get('/filters', getFilters);

module.exports = router;