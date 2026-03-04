const Attendance = require('../models/Attendance');
const { calculateFine, FINE_MODE } = require('../utils/fineCalculator');
const { sessionKey } = require('./leaveController');
const { buildLeaveAndCheshtaStatus } = require('../utils/leaveCheshtaHelper');

// ── IST helpers ──────────────────────────────────────────────────────────────

/** Returns today's date string YYYY-MM-DD in Asia/Kolkata timezone */
function getISTToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Returns yesterday's date string YYYY-MM-DD computed from a given YYYY-MM-DD string */
function getYesterday(todayStr) {
    const [y, m, d] = todayStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - 1));
    return dt.toISOString().slice(0, 10);
}

/** Returns number of days in a month (1-indexed month) */
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/** Inclusive day count between two YYYY-MM-DD strings */
function diffDays(startStr, endStr) {
    const s = new Date(startStr + 'T00:00:00Z');
    const e = new Date(endStr + 'T00:00:00Z');
    return Math.round((e - s) / 86400000) + 1;
}

function addDays(dateStr, offset) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return dt.toISOString().slice(0, 10);
}

// ── Controller ───────────────────────────────────────────────────────────────

// GET /api/dashboard?month=YYYY-MM
const getDashboard = async (req, res) => {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);

    if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: 'Month must be between 01 and 12' });
    }

    const todayIST = getISTToday();
    const todayYYYYMM = todayIST.slice(0, 7);
    const isCurrentMonth = month === todayYYYYMM;

    const monthStart = `${month}-01`;
    const fullMonthDays = getDaysInMonth(year, monthNum);
    const monthEnd = `${month}-${String(fullMonthDays).padStart(2, '0')}`;

    try {
        // All records for this month, newest first
        const records = await Attendance.find({
            userId: req.user._id,
            date: { $regex: `^${month}-` },
        }).sort({ date: -1 });

        // Latest date with at least one session marked
        const lastEntryRecord = records.find(
            (r) => r.morning !== null || r.evening !== null
        );
        const lastEntryDateInMonth = lastEntryRecord ? lastEntryRecord.date : null;

        // ── Determine countedUntilDate & countedDays ─────────────────────────
        let countedUntilDate = null;
        let countedDays = 0;

        if (!isCurrentMonth) {
            // Past month: always full month
            countedUntilDate = monthEnd;
            countedDays = fullMonthDays;
        } else {
            // Current month — need entries to count anything
            if (lastEntryDateInMonth) {
                const todayRecord = records.find((r) => r.date === todayIST);
                const todayEntryDone = !!(
                    todayRecord &&
                    (todayRecord.morning !== null || todayRecord.evening !== null)
                );

                const yesterdayIST = getYesterday(todayIST);

                let candidateDate;
                if (todayEntryDone) {
                    candidateDate = todayIST;
                } else if (yesterdayIST >= monthStart) {
                    candidateDate = yesterdayIST;
                } else {
                    // Today is the 1st and no entry — zero counted days
                    candidateDate = null;
                }

                if (candidateDate !== null) {
                    // Cap at last actual entry (don't claim future un-entered days)
                    countedUntilDate =
                        candidateDate <= lastEntryDateInMonth
                            ? candidateDate
                            : lastEntryDateInMonth;
                    countedDays = diffDays(monthStart, countedUntilDate);
                }
            }
        }

        // ── Build base range, leaves, Cheshta status, and attendance maps ───
        const D = countedDays;
        let effectiveMorningDays = 0;
        let effectiveEveningDays = 0;
        let blockedMorningSessionsCount = 0;
        let blockedEveningSessionsCount = 0;

        let morningPresent = 0;
        let morningAbsent = 0;
        let eveningPresent = 0;
        let eveningAbsent = 0;

        let morningMissing = 0;
        let eveningMissing = 0;

        const attendanceByDate = {};
        records.forEach((r) => {
            attendanceByDate[r.date] = r;
        });

        // Leave + Cheshta status, and helper to test active blocking
        const {
            shortLeaveStatus,
            totalInactiveShortLeaveSessions,
            cheshtaMonthTotal,
            isSessionBlockedByActiveLeave,
            showCheshtaUI,
            hasSmallLeaveInMonth,
            hasPendingSmallLeave,
            pendingCheshtaRequiredTotal,
            nextPendingLeaveInfo,
        } = await buildLeaveAndCheshtaStatus(req.user._id, monthStart, monthEnd);

        // ── Full month effective denominators (after leave) ─────────────────
        let totalEffectiveMorningSessionsInMonth = 0;
        let totalEffectiveEveningSessionsInMonth = 0;

        for (let i = 0; i < fullMonthDays; i++) {
            const dateStr = addDays(monthStart, i);

            if (!isSessionBlockedByActiveLeave(dateStr, 'morning')) {
                totalEffectiveMorningSessionsInMonth += 1;
            }
            if (!isSessionBlockedByActiveLeave(dateStr, 'evening')) {
                totalEffectiveEveningSessionsInMonth += 1;
            }
        }

        // ── Count stats only within counted range (monthStart..countedUntil) ─
        if (D > 0 && countedUntilDate) {
            for (let i = 0; i < D; i++) {
                const dateStr = addDays(monthStart, i);
                const record = attendanceByDate[dateStr];

                // Morning
                if (isSessionBlockedByActiveLeave(dateStr, 'morning')) {
                    blockedMorningSessionsCount += 1;
                } else {
                    effectiveMorningDays += 1;
                    const v = record ? record.morning : null;
                    if (v === 'present') morningPresent += 1;
                    else if (v === 'absent') morningAbsent += 1;
                    else morningMissing += 1;
                }

                // Evening
                if (isSessionBlockedByActiveLeave(dateStr, 'evening')) {
                    blockedEveningSessionsCount += 1;
                } else {
                    effectiveEveningDays += 1;
                    const v = record ? record.evening : null;
                    if (v === 'present') eveningPresent += 1;
                    else if (v === 'absent') eveningAbsent += 1;
                    else eveningMissing += 1;
                }
            }
        }

        // ── Fine calculation ─────────────────────────────────────────────────
        const morningResult = calculateFine(
            effectiveMorningDays,
            morningPresent,
            morningAbsent,
            morningMissing,
            'morning'
        );
        const eveningResult = calculateFine(
            effectiveEveningDays,
            eveningPresent,
            eveningAbsent,
            eveningMissing,
            'evening'
        );
        const totalFine = morningResult.fine + eveningResult.fine;

        // ── Safe bunk remaining (only for current month) ────────────────────
        let safeBunkMorningSessionsRemaining = null;
        let safeBunkEveningSessionsRemaining = null;

        const strict = FINE_MODE === 'STRICT';

        if (isCurrentMonth) {
            const M = totalEffectiveMorningSessionsInMonth;
            const E = totalEffectiveEveningSessionsInMonth;

            if (M > 0) {
                const currentAbsentEffectiveM = morningAbsent + (strict ? morningMissing : 0);
                const maxTotalAbsentWithout10_M = M - Math.ceil(M * 0.5); // keep present >= 50%
                let remainingM = maxTotalAbsentWithout10_M - currentAbsentEffectiveM;
                // cannot safely bunk more than remaining effective sessions in the month
                const remainingEffectiveMorning = Math.max(0, M - effectiveMorningDays);
                remainingM = Math.min(remainingM, remainingEffectiveMorning);
                safeBunkMorningSessionsRemaining = remainingM > 0 ? remainingM : 0;
            } else {
                safeBunkMorningSessionsRemaining = 0;
            }

            if (E > 0) {
                const currentAbsentEffectiveE = eveningAbsent + (strict ? eveningMissing : 0);
                const maxTotalAbsentWithout10_E = Math.floor(E * 0.25); // keep absent <= 25%
                let remainingE = maxTotalAbsentWithout10_E - currentAbsentEffectiveE;
                const remainingEffectiveEvening = Math.max(0, E - effectiveEveningDays);
                remainingE = Math.min(remainingE, remainingEffectiveEvening);
                safeBunkEveningSessionsRemaining = remainingE > 0 ? remainingE : 0;
            } else {
                safeBunkEveningSessionsRemaining = 0;
            }
        }

        const morning10RuleThresholdMessage =
            'Morning: Keep Present \u2265 50% of effective sessions (50% is safe).';
        const evening10RuleThresholdMessage =
            'Evening: Keep Absent \u2264 25% of effective sessions (25% is safe).';

        const fineIncludesPendingShortLeave = hasPendingSmallLeave;
        const message = fineIncludesPendingShortLeave
            ? 'Fine is currently including short-leave sessions until Cheshta is completed.'
            : undefined;

        res.json({
            month,
            isCurrentMonth,
            D,
            monthStart,
            countedUntilDate,
            lastEntryDateInMonth,
            fineMode: FINE_MODE,
            effectiveMorningDays,
            effectiveEveningDays,
            blockedMorningSessionsCount,
            blockedEveningSessionsCount,
            totalEffectiveMorningSessionsInMonth,
            totalEffectiveEveningSessionsInMonth,
            safeBunkMorningSessionsRemaining,
            safeBunkEveningSessionsRemaining,
            cheshtaMonthTotal,
            shortLeaveStatus,
            totalInactiveShortLeaveSessions,
            morning10RuleThresholdMessage,
            evening10RuleThresholdMessage,
            showCheshtaUI,
            hasSmallLeaveInMonth,
            hasPendingSmallLeave,
            pendingCheshtaRequiredTotal,
            nextPendingLeaveInfo,
            fineIncludesPendingShortLeave,
            message,
            morning: {
                present: morningPresent,
                absent: morningAbsent,
                missing: morningMissing,
                presentPct: morningResult.presentPct,
                absentPct: morningResult.absentPct,
                fine: morningResult.fine,
                rule: morningResult.rule,
                level: morningResult.level,
            },
            evening: {
                present: eveningPresent,
                absent: eveningAbsent,
                missing: eveningMissing,
                presentPct: eveningResult.presentPct,
                absentPct: eveningResult.absentPct,
                fine: eveningResult.fine,
                rule: eveningResult.rule,
                level: eveningResult.level,
            },
            totalFine,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboard };
