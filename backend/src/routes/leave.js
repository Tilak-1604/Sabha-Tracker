const express = require('express');
const { addLeave, getLeavesForMonth, deleteLeave } = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/add', addLeave);
router.get('/', getLeavesForMonth);
router.delete('/:id', deleteLeave);

module.exports = router;

