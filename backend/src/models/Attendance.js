const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: String, // YYYY-MM-DD
            required: true,
        },
        morning: {
            type: String,
            enum: ['present', 'absent', null],
            default: null,
        },
        evening: {
            type: String,
            enum: ['present', 'absent', null],
            default: null,
        },
    },
    { timestamps: true }
);

// Ensure one record per user per date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
