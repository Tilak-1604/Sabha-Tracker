const express = require('express');
const { upsertAttendance, getDayAttendance, getMonthHistory } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/upsert', upsertAttendance);
router.get('/day', getDayAttendance);
router.get('/history', getMonthHistory);

module.exports = router;
