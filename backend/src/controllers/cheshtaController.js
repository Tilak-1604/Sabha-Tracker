const CheshtaLog = require('../models/CheshtaLog');

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// POST /api/cheshta/add
const addCheshta = async (req, res) => {
  const { date } = req.body;

  if (!isValidDate(date)) {
    return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
  }

  // Prevent future dates (IST)
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (date > todayIST) {
    return res.status(400).json({ message: 'Cheshta date cannot be in the future' });
  }

  try {
    const log = await CheshtaLog.create({
      userId: req.user._id,
      date,
    });
    res.status(201).json(log);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Only 1 Cheshta allowed per day' });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/cheshta?month=YYYY-MM
const getCheshtaForMonth = async (req, res) => {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
  }

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  if (monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ message: 'Month must be between 01 and 12' });
  }

  const monthStart = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

  try {
    const logs = await CheshtaLog.find({
      userId: req.user._id,
      date: { $gte: monthStart, $lte: monthEnd },
    }).sort({ date: 1, createdAt: 1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/cheshta/:id
const deleteCheshta = async (req, res) => {
  const { id } = req.params;
  try {
    const log = await CheshtaLog.findById(id);
    if (!log || String(log.userId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Cheshta entry not found' });
    }
    await log.deleteOne();
    res.json({ message: 'Cheshta entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/cheshta/status?month=YYYY-MM
// Lightweight endpoint for UI visibility without fetching full dashboard
const getCheshtaStatus = async (req, res) => {
  try {
    let { month } = req.query;

    // Default to current IST month if not provided
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const monthStart = `${month}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

    const { buildLeaveAndCheshtaStatus } = require('../utils/leaveCheshtaHelper');
    const status = await buildLeaveAndCheshtaStatus(req.user._id, monthStart, monthEnd);

    res.json({
      showCheshtaUI: status.showCheshtaUI,
      hasSmallLeaveInMonth: status.hasSmallLeaveInMonth,
      hasPendingSmallLeave: status.hasPendingSmallLeave,
      pendingCheshtaRequiredTotal: status.pendingCheshtaRequiredTotal,
      nextPendingLeaveInfo: status.nextPendingLeaveInfo,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addCheshta, getCheshtaForMonth, deleteCheshta, getCheshtaStatus };

