const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // YYYY-MM-DD in IST — one record per student per calendar day
        date: {
            type: String,
            required: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        reasonFlags: {
            attendanceMissing: { type: Boolean, default: false },
            cheshtaPending: { type: Boolean, default: false },
        },
    },
    { timestamps: false }
);

// Guarantees at most 1 reminder per student per IST day
reminderLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
