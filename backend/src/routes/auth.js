const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('rollNo').trim().notEmpty().withMessage('Roll number is required'),
        body('roomNo').trim().notEmpty().withMessage('Room number is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    register
);

router.post(
    '/login',
    [
        body('rollNo').trim().notEmpty().withMessage('Roll number is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    login
);

router.get('/me', protect, getMe);

module.exports = router;
