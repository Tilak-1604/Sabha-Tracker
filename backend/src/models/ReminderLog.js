const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // YYYY-MM-DD in IST
        date: {
            type: String,
            required: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
            index: true, // indexed for the 14-min rolling dedup query
        },
        reasonFlags: {
            attendanceMissing: { type: Boolean, default: false },
            cheshtaPending: { type: Boolean, default: false },
        },
    },
    { timestamps: false }
);

// Compound index for lookup: "find most recent reminder for this user today"
reminderLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
