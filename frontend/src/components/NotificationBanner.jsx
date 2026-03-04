import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * NotificationBanner
 *
 * Renders a smart notification opt-in / opt-out banner.
 * Shows different states: unsupported, denied, not-yet-enabled, enabled.
 */
export default function NotificationBanner() {
    const {
        permissionStatus,
        isEnabled,
        isLoading,
        enableNotifications,
        disableNotifications,
    } = usePushNotifications();

    // Don't render if push notifications are not supported by this browser
    if (permissionStatus === 'unsupported') return null;

    // ── Denied: guide the user to browser settings ────────────────────────────
    if (permissionStatus === 'denied') {
        return (
            <div className="notif-banner notif-banner--denied" role="alert">
                <span className="notif-banner__icon">🚫</span>
                <div className="notif-banner__text">
                    <strong>Notifications are blocked.</strong>
                    <span> To receive daily reminders, allow notifications for this site in your browser settings.</span>
                </div>
            </div>
        );
    }

    // ── Granted + registered: show "On" badge with disable option ─────────────
    if (permissionStatus === 'granted' && isEnabled) {
        return (
            <div className="notif-banner notif-banner--enabled" role="status">
                <span className="notif-banner__icon">🔔</span>
                <div className="notif-banner__text">
                    <strong>Notifications On</strong>
                    <span> You'll receive a reminder at 10:15 PM if something needs attention.</span>
                </div>
                <button
                    className="notif-banner__btn notif-banner__btn--secondary"
                    onClick={disableNotifications}
                    disabled={isLoading}
                    aria-label="Disable push notifications"
                >
                    {isLoading ? 'Disabling…' : 'Disable'}
                </button>
            </div>
        );
    }

    // ── Default / granted but not yet registered: show "Enable" CTA ──────────
    return (
        <div className="notif-banner notif-banner--default" role="complementary">
            <span className="notif-banner__icon">🔔</span>
            <div className="notif-banner__text">
                <strong>Enable Notifications</strong>
                <span> Get a reminder at 10:15 PM if your attendance or Cheshta needs attention.</span>
            </div>
            <button
                className="notif-banner__btn notif-banner__btn--primary"
                onClick={enableNotifications}
                disabled={isLoading}
                aria-label="Enable push notifications"
            >
                {isLoading ? 'Enabling…' : 'Enable (Recommended)'}
            </button>
        </div>
    );
}
