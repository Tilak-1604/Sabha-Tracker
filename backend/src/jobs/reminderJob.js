const User = require('../models/User');
const Attendance = require('../models/Attendance');
const ReminderLog = require('../models/ReminderLog');
const { buildLeaveAndCheshtaStatus } = require('../utils/leaveCheshtaHelper');
const { sendPushToTokens } = require('../services/fcmSender');
const { DateTime } = require('luxon');

/**
 * Returns today's date in Asia/Kolkata as a YYYY-MM-DD string.
 * Uses Luxon so it is always correct regardless of server timezone.
 */
function getTodayIST() {
    return DateTime.now().setZone('Asia/Kolkata').toISODate();
}

/**
 * Core logic: collect students who need a reminder and send notifications.
 * Can be called by the cron job or manually for testing.
 */
async function runReminderJob() {
    const todayIST = getTodayIST();
    console.log(`[Reminder] Running for date: ${todayIST} (IST)`);

    // Only fetch users who have push enabled and have at least one token
    const users = await User.find({
        pushEnabled: true,
        'pushTokens.0': { $exists: true },
    }).select('_id name pushTokens');

    for (const user of users) {
        try {
            await processUser(user, todayIST);
        } catch (err) {
            console.error(`[Reminder] Error processing user ${user._id}:`, err.message);
        }
    }

    console.log(`[Reminder] Done — processed ${users.length} user(s).`);
}

async function processUser(user, todayIST) {
    const userId = user._id;

    // ── Attendance check ─────────────────────────────────────────────────────
    const attendance = await Attendance.findOne({ userId, date: todayIST });

    // Strict rule: both sessions must be non-null to count as "fully marked"
    const missingMorning = !attendance || attendance.morning == null;
    const missingEvening = !attendance || attendance.evening == null;
    const attendanceMissing = missingMorning || missingEvening;

    // ── Cheshta / leave check ─────────────────────────────────────────────────
    const monthStr = todayIST.slice(0, 7); // YYYY-MM
    const monthStart = `${monthStr}-01`;
    // Last day of this month
    const lastDay = DateTime.fromISO(monthStart, { zone: 'Asia/Kolkata' })
        .endOf('month')
        .toISODate();

    const { hasPendingSmallLeave, pendingCheshtaRequiredTotal, nextPendingLeaveInfo } =
        await buildLeaveAndCheshtaStatus(userId, monthStart, lastDay);

    // Only flag cheshta pending if leave has ended and Cheshta is still required
    const cheshtaPending =
        hasPendingSmallLeave &&
        pendingCheshtaRequiredTotal > 0 &&
        nextPendingLeaveInfo != null &&
        nextPendingLeaveInfo.leaveEndDate < todayIST; // leave has ended (past day)

    // ── Skip if nothing to remind ─────────────────────────────────────────────
    if (!attendanceMissing && !cheshtaPending) {
        console.log(`[Reminder] No reminder needed for user ${userId} on ${todayIST}.`);
        return;
    }

    // ── Compose message ───────────────────────────────────────────────────────
    const morningStatus = missingMorning ? 'Not Marked' : 'Marked ✓';
    const eveningStatus = missingEvening ? 'Not Marked' : 'Marked ✓';

    let bodyLines = [
        `📅 Date: ${todayIST}`,
        `🟡 Attendance:`,
        `  • Morning: ${morningStatus}`,
        `  • Evening: ${eveningStatus}`,
    ];

    if (cheshtaPending) {
        bodyLines = bodyLines.concat([
            `🟠 Cheshta Pending:`,
            `  • Remaining: ${pendingCheshtaRequiredTotal}`,
            `  • For Leave Ended: ${nextPendingLeaveInfo.leaveEndDate}`,
            `  (Until completed, fine will be added.)`,
        ]);
    }

    bodyLines.push(`✅ Open app to update before midnight.`);

    const title = 'Hostel Tracker Reminder';
    const body = bodyLines.join('\n');

    // ── Send FCM ──────────────────────────────────────────────────────────────
    const tokens = user.pushTokens.map((t) => t.token);
    const { successCount, failedTokens } = await sendPushToTokens(tokens, title, body);

    console.log(
        `[Reminder] Sent to user ${userId}: ${successCount} ok, ${failedTokens.length} failed.`
    );

    // Remove stale tokens from DB
    if (failedTokens.length > 0) {
        await User.updateOne(
            { _id: userId },
            { $pull: { pushTokens: { token: { $in: failedTokens } } } }
        );
        // If all tokens are gone, set pushEnabled false
        const freshUser = await User.findById(userId).select('pushTokens');
        if (!freshUser.pushTokens || freshUser.pushTokens.length === 0) {
            await User.updateOne({ _id: userId }, { $set: { pushEnabled: false } });
        }
    }

    // ── Log to ReminderLog ─────────────────
    await ReminderLog.create({
        userId,
        date: todayIST,
        sentAt: new Date(),
        reasonFlags: { attendanceMissing, cheshtaPending },
    });
}

module.exports = { runReminderJob, getTodayIST };
