const cron = require('node-cron');
const { runReminderJob } = require('./reminderJob');

/**
 * Schedule the nightly reminder at 22:15 Asia/Kolkata.
 *
 * node-cron 5-field format: minute hour day-of-month month day-of-week
 * "15 22 * * *" = every day at 22:15 with the given timezone.
 */
function startReminderScheduler() {
    cron.schedule(
        '15 22 * * *',
        async () => {
            console.log('[Scheduler] Reminder job triggered at 22:15 IST');
            try {
                await runReminderJob();
            } catch (err) {
                console.error('[Scheduler] Reminder job failed:', err.message);
            }
        },
        { timezone: 'Asia/Kolkata' }
    );

    console.log('[Scheduler] Nightly reminder scheduled: 22:15 Asia/Kolkata');
}

module.exports = { startReminderScheduler };
