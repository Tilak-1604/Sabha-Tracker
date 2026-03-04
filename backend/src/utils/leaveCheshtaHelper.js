const Leave = require('../models/Leave');
const CheshtaLog = require('../models/CheshtaLog');

function parseYMD(str) {
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d };
}

// Convert (date, session) to a sortable numeric key in UTC days * 2 + sessionIndex
function sessionKey(dateStr, session) {
  const { y, m, d } = parseYMD(dateStr);
  const dayIndex = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const offset = session === 'evening' ? 1 : 0;
  return dayIndex * 2 + offset;
}
function computeLeaveSessionsCount(leave) {
  const start = sessionKey(leave.fromDate, leave.fromSession);
  const end = sessionKey(leave.toDate, leave.toSession);
  return end >= start ? end - start + 1 : 0;
}

/**
 * Returns leaves intersecting [monthStart, monthEnd] with short-leave / Cheshta status
 * and a function to test if a given (dateStr, session) is blocked by any ACTIVE leave.
 *
 * Also returns:
 *  - cheshtaMonthTotal: sum of Cheshta counts within month
 *  - shortLeaveStatus: array for all short leaves intersecting the month
 *  - totalInactiveShortLeaveSessions: overlapping short-leave sessions in month which are inactive
 *  - UI State fields for Cheshta visibility and popup
 */
async function buildLeaveAndCheshtaStatus(userId, monthStart, monthEnd) {
  // Fetch all leaves intersecting this month
  const leaves = await Leave.find({
    userId,
    $and: [{ toDate: { $gte: monthStart } }, { fromDate: { $lte: monthEnd } }],
  }).sort({ fromDate: 1, fromSession: 1 });

  // Fetch all leaves unconditionally to find any pending small leaves (even past ones)
  // that haven't been activated yet. This ensures the popup shows until fulfilled.
  const allUserLeaves = await Leave.find({ userId }).sort({ fromDate: 1, fromSession: 1 });

  const enrichLeaves = (leaveArray) => leaveArray.map((l) => {
    const obj = l.toObject ? l.toObject() : l;
    const sessions = computeLeaveSessionsCount(obj);
    return { ...obj, leaveSessionsCount: sessions };
  });

  const leavesWithCount = enrichLeaves(leaves);
  const allLeavesWithCount = enrichLeaves(allUserLeaves);

  const shortLeavesInMonth = leavesWithCount.filter((l) => l.leaveSessionsCount > 0 && l.leaveSessionsCount <= 6);
  const longLeavesInMonth = leavesWithCount.filter((l) => l.leaveSessionsCount > 6);
  const allShortLeaves = allLeavesWithCount.filter((l) => l.leaveSessionsCount > 0 && l.leaveSessionsCount <= 6);

  // Cheshta logs for month total (for UI)
  const cheshtaMonthLogs = await CheshtaLog.find({
    userId,
    date: { $gte: monthStart, $lte: monthEnd },
  });
  const cheshtaMonthTotal = cheshtaMonthLogs.reduce((sum, l) => sum + (l.count || 0), 0);

  // Fetch all cheshta logs to properly allocate across all short leaves
  const allActivationLogs = await CheshtaLog.find({ userId }).sort({ date: 1, createdAt: 1 });

  const logsForAllocation = allActivationLogs.map((log) => ({
    date: log.date,
    remaining: 1,
  }));

  // FIFO allocate Cheshta counts to all short leaves by end date
  const sortedAllShortLeaves = [...allShortLeaves].sort((a, b) => {
    if (a.toDate === b.toDate) return 0;
    return a.toDate < b.toDate ? -1 : 1;
  });

  let hasPendingSmallLeave = false;
  let pendingCheshtaRequiredTotal = 0;
  let nextPendingLeaveInfo = null;
  const shortLeaveStatusMap = new Map(); // Store status by leaveId

  for (const leave of sortedAllShortLeaves) {
    const required = leave.leaveSessionsCount;
    let remainingRequired = required;
    let completedForThisLeave = 0;

    for (const log of logsForAllocation) {
      if (!log.remaining) continue;
      if (log.date <= leave.toDate) continue; // only after leave end date

      const alloc = Math.min(log.remaining, remainingRequired);
      completedForThisLeave += alloc;
      remainingRequired -= alloc;
      log.remaining -= alloc;
      if (remainingRequired <= 0) break;
    }

    const isActiveLeaveBlocking = completedForThisLeave >= required;
    const remainingCheshtaToActivate = Math.max(0, required - completedForThisLeave);

    shortLeaveStatusMap.set(String(leave._id), {
      leaveId: leave._id,
      fromDate: leave.fromDate,
      fromSession: leave.fromSession,
      toDate: leave.toDate,
      toSession: leave.toSession,
      leaveSessionsCount: leave.leaveSessionsCount,
      requiredCheshta: required,
      cheshtaCompletedAfterReturn: completedForThisLeave,
      isActiveLeaveBlocking,
      remainingCheshtaToActivate,
    });

    if (!isActiveLeaveBlocking) {
      hasPendingSmallLeave = true;
      pendingCheshtaRequiredTotal += remainingCheshtaToActivate;
      if (!nextPendingLeaveInfo) {
        // Earliest pending leave
        nextPendingLeaveInfo = {
          leaveId: leave._id,
          fromDate: leave.fromDate,
          fromSession: leave.fromSession,
          toDate: leave.toDate,
          toSession: leave.toSession,
          leaveSessionsCount: leave.leaveSessionsCount,
          requiredCheshta: required,
          completedCheshtaAllocated: completedForThisLeave,
          remainingCheshta: remainingCheshtaToActivate,
          leaveEndDate: leave.toDate,
        };
      }
    }
  }

  // Build the array just for the short leaves intersecting this month
  const shortLeaveStatus = [];
  let totalInactiveShortLeaveSessions = 0;
  const monthStartKey = sessionKey(monthStart, 'morning');
  const monthEndKey = sessionKey(monthEnd, 'evening');

  for (const leave of shortLeavesInMonth) {
    const status = shortLeaveStatusMap.get(String(leave._id));
    shortLeaveStatus.push(status);

    // Overlapping sessions with this month
    const leaveStartKey = sessionKey(leave.fromDate, leave.fromSession);
    const leaveEndKey = sessionKey(leave.toDate, leave.toSession);
    const overlapStart = Math.max(leaveStartKey, monthStartKey);
    const overlapEnd = Math.min(leaveEndKey, monthEndKey);
    const overlapSessionsInMonth = overlapStart <= overlapEnd ? overlapEnd - overlapStart + 1 : 0;

    if (!status.isActiveLeaveBlocking) {
      totalInactiveShortLeaveSessions += overlapSessionsInMonth;
    }
  }

  // Build active leave ranges (short + long) intersecting this month
  const activeLeaves = [];
  // Long leaves always active
  longLeavesInMonth.forEach((l) => {
    activeLeaves.push(l);
  });
  // Active short leaves in month
  shortLeaveStatus.forEach((s) => {
    if (s.isActiveLeaveBlocking) {
      const original = shortLeavesInMonth.find((l) => String(l._id) === String(s.leaveId));
      if (original) activeLeaves.push(original);
    }
  });

  const activeLeaveRanges = activeLeaves.map((l) => ({
    start: sessionKey(l.fromDate, l.fromSession),
    end: sessionKey(l.toDate, l.toSession),
  }));

  const isSessionBlockedByActiveLeave = (dateStr, session) => {
    const key = sessionKey(dateStr, session);
    return activeLeaveRanges.some((r) => key >= r.start && key <= r.end);
  };

  const hasSmallLeaveInMonth = shortLeavesInMonth.length > 0;
  const showCheshtaUI = hasSmallLeaveInMonth || hasPendingSmallLeave;

  return {
    leavesWithCount,
    shortLeaveStatus,
    totalInactiveShortLeaveSessions,
    cheshtaMonthTotal,
    isSessionBlockedByActiveLeave,
    // New UI fields
    hasSmallLeaveInMonth,
    hasPendingSmallLeave,
    pendingCheshtaRequiredTotal,
    nextPendingLeaveInfo,
    showCheshtaUI,
  };
}

module.exports = {
  sessionKey,
  computeLeaveSessionsCount,
  buildLeaveAndCheshtaStatus,
};


