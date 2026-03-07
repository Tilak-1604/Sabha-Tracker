const User = require('../models/User');

/**
 * POST /api/push/register
 * Body: { token: string, deviceLabel?: string }
 *
 * Upserts the FCM token into the user's pushTokens array (no duplicates).
 * Sets pushEnabled = true.
 */
const registerToken = async (req, res) => {
    const { token, deviceLabel } = req.body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
        return res.status(400).json({ message: 'token is required' });
    }

    const device = (deviceLabel || 'unknown').trim().slice(0, 100);

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existing = user.pushTokens.find((t) => t.token === token);
        if (existing) {
            // Refresh lastSeenAt
            existing.lastSeenAt = new Date();
        } else {
            user.pushTokens.push({ token, device, createdAt: new Date(), lastSeenAt: new Date() });
        }

        user.pushEnabled = true;
        await user.save();

        return res.json({ message: 'Token registered', pushEnabled: true });
    } catch (err) {
        console.error('[Push] registerToken error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/push/unregister
 * Body: { token: string }
 *
 * Removes the FCM token from pushTokens.
 * If no tokens remain, sets pushEnabled = false.
 */
const unregisterToken = async (req, res) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
        return res.status(400).json({ message: 'token is required' });
    }

    try {
        await User.updateOne(
            { _id: req.user._id },
            { $pull: { pushTokens: { token } } }
        );

        // Check if user still has tokens
        const user = await User.findById(req.user._id).select('pushTokens');
        const hasTokens = user.pushTokens && user.pushTokens.length > 0;

        if (!hasTokens) {
            await User.updateOne({ _id: req.user._id }, { $set: { pushEnabled: false } });
        }

        return res.json({
            message: 'Token unregistered',
            pushEnabled: hasTokens,
        });
    } catch (err) {
        console.error('[Push] unregisterToken error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/push/test-run  (protected, any logged-in user for testing)
 *
 * Manually triggers the reminder job without waiting for cron.
 * Useful for debugging FCM delivery when developing.
 */
const testRunReminder = async (req, res) => {
    console.log(`\n[Push] ⚡ Manual test-run triggered by user ${req.user._id} (${req.user.name || 'unknown'})`);
    try {
        const { runReminderJob } = require('../jobs/reminderJob');
        const summary = await runReminderJob();
        return res.json({
            success: true,
            message: 'Reminder job executed manually.',
            summary,
        });
    } catch (err) {
        console.error('[Push] test-run error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { registerToken, unregisterToken, testRunReminder };
