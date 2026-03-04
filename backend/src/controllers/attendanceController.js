const Attendance = require('../models/Attendance');

// POST /api/attendance/upsert
const upsertAttendance = async (req, res) => {
    const { date, morning, evening } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const validValues = ['present', 'absent', null];
    if (!validValues.includes(morning) || !validValues.includes(evening)) {
        return res.status(400).json({ message: 'morning and evening must be present, absent, or null' });
    }

    try {
        const record = await Attendance.findOneAndUpdate(
            { userId: req.user._id, date },
            { morning, evening },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/attendance/day?date=YYYY-MM-DD
const getDayAttendance = async (req, res) => {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    try {
        const record = await Attendance.findOne({ userId: req.user._id, date });
        if (!record) {
            return res.json({ date, morning: null, evening: null });
        }
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/attendance/history?month=YYYY-MM
const getMonthHistory = async (req, res) => {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    try {
        const records = await Attendance.find({
            userId: req.user._id,
            date: { $regex: `^${month}-` },
        }).sort({ date: 1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { upsertAttendance, getDayAttendance, getMonthHistory };
