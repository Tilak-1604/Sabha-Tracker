const Leave = require('../models/Leave');
const { buildLeaveAndCheshtaStatus, sessionKey } = require('../utils/leaveCheshtaHelper');

const SESSION_VALUES = ['morning', 'evening'];

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// Check if two [start,end] ranges on the same key space overlap
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

// POST /api/leave/add
const addLeave = async (req, res) => {
  const { fromDate, fromSession, toDate, toSession, reason } = req.body;

  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    return res.status(400).json({ message: 'fromDate and toDate must be in YYYY-MM-DD format' });
  }

  if (!SESSION_VALUES.includes(fromSession) || !SESSION_VALUES.includes(toSession)) {
    return res.status(400).json({ message: 'fromSession and toSession must be "morning" or "evening"' });
  }

  if (fromDate > toDate) {
    return res.status(400).json({ message: 'fromDate cannot be after toDate' });
  }

  const startKey = sessionKey(fromDate, fromSession);
  const endKey = sessionKey(toDate, toSession);

  if (startKey > endKey) {
    return res.status(400).json({ message: 'from session must be on or before to session' });
  }

  try {
    // Find potential overlapping leaves for this user in a coarse date range
    const existingLeaves = await Leave.find({
      userId: req.user._id,
      // coarse filter by date range intersection
      $and: [
        { toDate: { $gte: fromDate } },
        { fromDate: { $lte: toDate } },
      ],
    });

    for (const l of existingLeaves) {
      const lStart = sessionKey(l.fromDate, l.fromSession);
      const lEnd = sessionKey(l.toDate, l.toSession);
      if (rangesOverlap(startKey, endKey, lStart, lEnd)) {
        return res
          .status(400)
          .json({ message: 'Leave range overlaps with an existing leave. Please adjust dates or sessions.' });
      }
    }

    const leave = await Leave.create({
      userId: req.user._id,
      fromDate,
      fromSession,
      toDate,
      toSession,
      reason: reason || '',
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/leave?month=YYYY-MM
const getLeavesForMonth = async (req, res) => {
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
    const {
      leavesWithCount,
      shortLeaveStatus,
    } = await buildLeaveAndCheshtaStatus(req.user._id, monthStart, monthEnd);

    // Map short leave status by id for quick lookup
    const statusById = {};
    shortLeaveStatus.forEach((s) => {
      statusById[String(s.leaveId)] = s;
    });

    // Attach isActiveLeaveBlocking + leaveSessionsCount to each leave
    const enriched = leavesWithCount.map((l) => {
      const s = statusById[String(l._id)];
      const isShort = l.leaveSessionsCount > 0 && l.leaveSessionsCount <= 6;
      const isActiveLeaveBlocking = isShort ? !!(s && s.isActiveLeaveBlocking) : true;
      return {
        ...l,
        isActiveLeaveBlocking,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/leave/:id
const deleteLeave = async (req, res) => {
  const { id } = req.params;

  try {
    const leave = await Leave.findById(id);
    if (!leave || String(leave.userId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    await leave.deleteOne();
    res.json({ message: 'Leave deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addLeave, getLeavesForMonth, deleteLeave, sessionKey };

