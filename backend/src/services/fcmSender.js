/**
 * FCM Sender — Firebase Admin SDK wrapper
 *
 * Initialises firebase-admin once from a service account JSON file.
 * SETUP: Set FIREBASE_SERVICE_ACCOUNT_PATH in backend/.env to point to your
 *        service account JSON file (e.g. ./firebase-service-account.json).
 */
const admin = require('firebase-admin');
const path = require('path');

let messagingInstance = null;

function getMessaging() {
    if (messagingInstance) return messagingInstance;

    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!saPath) {
        throw new Error(
            '[FCM] FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env. ' +
            'Download your service account JSON from Firebase Console → ' +
            'Project Settings → Service Accounts → Generate new private key.'
        );
    }

    console.log(`[FCM] Loading service account from: ${path.resolve(saPath)}`);

    let serviceAccount;
    try {
        serviceAccount = require(path.resolve(saPath));
    } catch (err) {
        throw new Error(`[FCM] Failed to load service account file at "${saPath}": ${err.message}`);
    }

    // Only initialise once (guard against hot-reload double-init)
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('[FCM] ✅ Firebase Admin SDK initialized successfully.');
    }

    messagingInstance = admin.messaging();
    return messagingInstance;
}

/**
 * Send a push message to a list of FCM tokens.
 *
 * @param {string[]} tokens
 * @param {string}   title
 * @param {string}   body
 * @returns {{ successCount: number, failureCount: number, failedTokens: string[], results: object[] }}
 */
async function sendPushToTokens(tokens, title, body) {
    if (!tokens || tokens.length === 0) {
        console.log('[FCM] No tokens provided, skipping send.');
        return { successCount: 0, failureCount: 0, failedTokens: [], results: [] };
    }

    console.log(`[FCM] Sending to ${tokens.length} token(s)...`);

    let messaging;
    try {
        messaging = getMessaging();
    } catch (err) {
        console.error('[FCM] ❌ Could not initialise Firebase Admin SDK:', err.message);
        return { successCount: 0, failureCount: tokens.length, failedTokens: tokens, results: [] };
    }

    const failedTokens = [];
    const results = [];
    let successCount = 0;

    // Send individually so we can track which tokens failed per-token
    await Promise.all(
        tokens.map(async (token) => {
            const shortToken = token.slice(0, 25) + '…';
            try {
                const messageId = await messaging.send({
                    token,
                    notification: { title, body },
                    webpush: {
                        notification: {
                            title,
                            body,
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/icon-72x72.png',
                            requireInteraction: false,
                        },
                        fcmOptions: {
                            link: '/dashboard',
                        },
                    },
                });

                successCount += 1;
                results.push({ token: shortToken, status: 'success', messageId });
                console.log(`[FCM]   ✅ Token ${shortToken} → messageId: ${messageId}`);

            } catch (err) {
                const errCode = err?.errorInfo?.code || err?.code || 'unknown';
                const errMessage = err?.errorInfo?.message || err?.message || String(err);

                console.error(`[FCM]   ❌ Token ${shortToken} FAILED`);
                console.error(`[FCM]      code   : ${errCode}`);
                console.error(`[FCM]      message: ${errMessage}`);

                results.push({ token: shortToken, status: 'failed', errCode, errMessage });

                // These codes mean the token is permanently invalid — remove from DB
                const invalidCodes = [
                    'messaging/registration-token-not-registered',
                    'messaging/invalid-registration-token',
                    'messaging/invalid-argument',
                ];
                if (invalidCodes.includes(errCode)) {
                    failedTokens.push(token);
                }
                // Other errors (quota, internal) — token is still valid, just a transient failure
            }
        })
    );

    const failureCount = tokens.length - successCount;
    console.log(`[FCM] Done. Sent: ${successCount}/${tokens.length}, Failed permanently: ${failedTokens.length}`);

    return { successCount, failureCount, failedTokens, results };
}

module.exports = { sendPushToTokens };
