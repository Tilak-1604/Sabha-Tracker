const cron = require('node-cron');
const { runReminderJob } = require('./reminderJob');

// Schedule is controlled via env vars:
//   REMINDER_CRON     - cron expression  (default: "*/15 * * * *" for testing)
//   REMINDER_TIMEZONE - timezone string  (default: "Asia/Kolkata")
//
// Switch to production nightly: REMINDER_CRON=15 22 * * *

function startReminderScheduler() {
    const cronExpr = process.env.REMINDER_CRON || '*/15 * * * *';
    const cronTz = process.env.REMINDER_TIMEZONE || 'Asia/Kolkata';

    console.log('[Scheduler] Registering cron job');
    console.log('[Scheduler]   Expression : "' + cronExpr + '"');
    console.log('[Scheduler]   Timezone   : "' + cronTz + '"');

    if (!cron.validate(cronExpr)) {
        console.error('[Scheduler] Invalid REMINDER_CRON expression: "' + cronExpr + '". Fix .env and restart.');
        return;
    }

    cron.schedule(
        cronExpr,
        async () => {
            console.log('\n[Scheduler] Cron fired at ' + new Date().toISOString());
            try {
                await runReminderJob();
            } catch (err) {
                console.error('[Scheduler] Reminder job threw an unhandled error:', err.message);
                console.error(err.stack);
            }
        },
        { timezone: cronTz }
    );

    console.log('[Scheduler] Reminder cron registered successfully.');
}

module.exports = { startReminderScheduler };
