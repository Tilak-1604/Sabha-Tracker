const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    fromSession: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
    },
    toDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    toSession: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index to speed up range queries per user
leaveSchema.index({ userId: 1, fromDate: 1, toDate: 1 });

module.exports = mongoose.model('Leave', leaveSchema);

