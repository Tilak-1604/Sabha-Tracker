const mongoose = require('mongoose');

const cheshtaLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

cheshtaLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CheshtaLog', cheshtaLogSchema);

