const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// POST /api/auth/register
const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, rollNo, roomNo, password } = req.body;

    try {
        const existingUser = await User.findOne({ rollNo: rollNo.toUpperCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Roll number already registered' });
        }

        const user = await User.create({ name, rollNo, roomNo, password });
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                rollNo: user.rollNo,
                roomNo: user.roomNo,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rollNo, password } = req.body;

    try {
        const user = await User.findOne({ rollNo: rollNo.toUpperCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid roll number or password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid roll number or password' });
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                rollNo: user.rollNo,
                roomNo: user.roomNo,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    res.json({
        id: req.user._id,
        name: req.user.name,
        rollNo: req.user.rollNo,
        roomNo: req.user.roomNo,
    });
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login, getMe, changePassword };
