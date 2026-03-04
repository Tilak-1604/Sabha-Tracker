/**
 * Test script to manually trigger the reminder job
 * Useful for testing without waiting until 22:15 IST
 * 
 * Run: node test-reminder.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { runReminderJob } = require('./src/jobs/reminderJob');

async function main() {
    try {
        console.log('[Test] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[Test] MongoDB connected');

        console.log('\n[Test] Running reminder job...\n');
        await runReminderJob();

        console.log('\n[Test] Reminder job completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('[Test] Error:', err.message);
        process.exit(1);
    }
}

main();
