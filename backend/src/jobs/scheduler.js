const cron = require('node-cron');
const { runReminderJob } = require('./reminderJob');

/**
 * Schedule the nightly reminder at 22:15 Asia/Kolkata.
 *
 * node-cron 5-field format: minute hour day-of-month month day-of-week
 * "*/15 * * * * " = every 15 minutes
    */
function startReminderScheduler() {
    cron.schedule(
        '*/15 * * * *',
        async () => {
            console.log('[Scheduler] Reminder job triggered (15-min interval)');
            try {
                await runReminderJob();
            } catch (err) {
                console.error('[Scheduler] Reminder job failed:', err.message);
            }
        },
        { timezone: 'Asia/Kolkata' }
    );

    console.log('[Scheduler] 15-minute interval reminder scheduled');
}

module.exports = { startReminderScheduler };
