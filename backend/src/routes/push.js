const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { registerToken, unregisterToken, testRunReminder } = require('../controllers/pushController');

// POST /api/push/register — store FCM token for logged-in user
router.post('/register', protect, registerToken);

// POST /api/push/unregister — remove FCM token for logged-in user
router.post('/unregister', protect, unregisterToken);

// POST /api/push/test-run — manually trigger the reminder job (for debugging)
router.post('/test-run', protect, testRunReminder);

module.exports = router;

