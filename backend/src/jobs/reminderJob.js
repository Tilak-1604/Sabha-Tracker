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
 * Can be called by the cron job OR manually via the test API endpoint.
 *
 * @returns {object} summary of what happened
 */
async function runReminderJob() {
    const todayIST = getTodayIST();
    console.log(`\n[Reminder] ========== JOB START ==========`);
    console.log(`[Reminder] Date (IST): ${todayIST}`);
    console.log(`[Reminder] UTC time  : ${new Date().toISOString()}`);

    // Only fetch users who have push enabled and have at least one token
    const users = await User.find({
        pushEnabled: true,
        'pushTokens.0': { $exists: true },
    }).select('_id name pushTokens');

    console.log(`[Reminder] Eligible users found: ${users.length}`);

    if (users.length === 0) {
        console.log(`[Reminder] ⚠️  No users with pushEnabled=true and at least one token. Nothing to do.`);
        console.log(`[Reminder] ========== JOB END ==========\n`);
        return { processedCount: 0, sentCount: 0, skippedCount: 0 };
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users) {
        try {
            const result = await processUser(user, todayIST);
            if (result === 'sent') sentCount++;
            if (result === 'skipped') skippedCount++;
        } catch (err) {
            console.error(`[Reminder] ❌ Error processing user ${user._id} (${user.name}):`, err.message);
            console.error(err.stack);
        }
    }

    console.log(`[Reminder] ========== JOB END ==========`);
    console.log(`[Reminder] Summary — Users: ${users.length}, Sent: ${sentCount}, Skipped: ${skippedCount}\n`);

    return { processedCount: users.length, sentCount, skippedCount };
}

async function processUser(user, todayIST) {
    const userId = user._id;
    const tokenCount = user.pushTokens ? user.pushTokens.length : 0;

    console.log(`\n[Reminder]  → User: ${user.name} (${userId}) | Tokens: ${tokenCount}`);

    // ── Duplicate prevention: skip if already sent in the last 14 minutes ───────
    // We use a 14-min window so every 15-min cron cycle has exactly one window
    const fourteenMinsAgo = new Date(Date.now() - 14 * 60 * 1000);
    const recentLog = await ReminderLog.findOne({
        userId,
        date: todayIST,
        sentAt: { $gte: fourteenMinsAgo },
    });

    if (recentLog) {
        const ago = Math.round((Date.now() - recentLog.sentAt.getTime()) / 1000);
        console.log(`[Reminder]    ↩ Already sent ${ago}s ago, skipping (dedup window 14 min).`);
        return 'skipped';
    }

    // ── Attendance check ─────────────────────────────────────────────────────
    const attendance = await Attendance.findOne({ userId, date: todayIST });
    const missingMorning = !attendance || attendance.morning == null;
    const missingEvening = !attendance || attendance.evening == null;
    const attendanceMissing = missingMorning || missingEvening;

    console.log(`[Reminder]    Attendance record: ${attendance ? 'found' : 'NOT FOUND'}`);
    console.log(`[Reminder]    missingMorning: ${missingMorning}, missingEvening: ${missingEvening}, attendanceMissing: ${attendanceMissing}`);

    // ── Cheshta / leave check ─────────────────────────────────────────────────
    const monthStr = todayIST.slice(0, 7);
    const monthStart = `${monthStr}-01`;
    const lastDay = DateTime.fromISO(monthStart, { zone: 'Asia/Kolkata' })
        .endOf('month')
        .toISODate();

    const {
        hasPendingSmallLeave,
        pendingCheshtaRequiredTotal,
        nextPendingLeaveInfo,
    } = await buildLeaveAndCheshtaStatus(userId, monthStart, lastDay);

    const cheshtaPending =
        hasPendingSmallLeave &&
        pendingCheshtaRequiredTotal > 0 &&
        nextPendingLeaveInfo != null &&
        nextPendingLeaveInfo.leaveEndDate < todayIST;

    console.log(`[Reminder]    hasPendingSmallLeave: ${hasPendingSmallLeave}`);
    console.log(`[Reminder]    pendingCheshtaRequiredTotal: ${pendingCheshtaRequiredTotal}`);
    console.log(`[Reminder]    nextPendingLeaveInfo: ${JSON.stringify(nextPendingLeaveInfo)}`);
    console.log(`[Reminder]    cheshtaPending: ${cheshtaPending}`);

    // ── Skip if nothing to remind ─────────────────────────────────────────────
    if (!attendanceMissing && !cheshtaPending) {
        console.log(`[Reminder]    ✅ Nothing to remind for this user. Skipping.`);
        return 'skipped';
    }

    // ── Compose message ───────────────────────────────────────────────────────
    const morningStatus = missingMorning ? 'Not Marked ❌' : 'Marked ✓';
    const eveningStatus = missingEvening ? 'Not Marked ❌' : 'Marked ✓';

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
            `  (Fine will be added until completed.)`,
        ]);
    }

    bodyLines.push(`✅ Open app to update before midnight.`);

    const title = 'Hostel Tracker Reminder';
    const body = bodyLines.join('\n');

    const tokens = user.pushTokens.map((t) => t.token);

    console.log(`[Reminder]    Sending notification...`);
    console.log(`[Reminder]    Title : "${title}"`);
    console.log(`[Reminder]    Body  : "${body.replace(/\n/g, ' | ')}"`);
    console.log(`[Reminder]    Tokens: ${tokens.map((t) => t.slice(0, 20) + '…').join(', ')}`);

    // ── Send FCM ──────────────────────────────────────────────────────────────
    const fcmResult = await sendPushToTokens(tokens, title, body);

    console.log(`[Reminder]    FCM result → success: ${fcmResult.successCount}, failed: ${fcmResult.failedTokens.length}`);

    if (fcmResult.failedTokens.length > 0) {
        console.log(`[Reminder]    Removing ${fcmResult.failedTokens.length} stale token(s) from DB`);
        await User.updateOne(
            { _id: userId },
            { $pull: { pushTokens: { token: { $in: fcmResult.failedTokens } } } }
        );
        // If all tokens gone, disable push
        const freshUser = await User.findById(userId).select('pushTokens');
        if (!freshUser.pushTokens || freshUser.pushTokens.length === 0) {
            await User.updateOne({ _id: userId }, { $set: { pushEnabled: false } });
            console.log(`[Reminder]    pushEnabled set to false (no tokens left).`);
        }
    }

    // ── Log reminder ──────────────────────────────────────────────────────────
    await ReminderLog.create({
        userId,
        date: todayIST,
        sentAt: new Date(),
        reasonFlags: { attendanceMissing, cheshtaPending },
    });

    console.log(`[Reminder]    📝 ReminderLog created.`);

    return 'sent';
}

module.exports = { runReminderJob, getTodayIST };
