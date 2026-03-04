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

    const serviceAccount = require(path.resolve(saPath));

    // Only initialise once (guard against hot-reload double-init)
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
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
 * @returns {{ successCount: number, failedTokens: string[] }}
 */
async function sendPushToTokens(tokens, title, body) {
    if (!tokens || tokens.length === 0) {
        return { successCount: 0, failedTokens: [] };
    }

    const messaging = getMessaging();
    const failedTokens = [];
    let successCount = 0;

    // Send individually so we can track which tokens failed
    await Promise.all(
        tokens.map(async (token) => {
            try {
                await messaging.send({
                    token,
                    notification: { title, body },
                    webpush: {
                        notification: {
                            title,
                            body,
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/icon-72x72.png',
                            // Enable newlines in the body on supporting browsers
                            requireInteraction: false,
                        },
                        fcmOptions: {
                            link: '/dashboard',
                        },
                    },
                });
                successCount += 1;
            } catch (err) {
                // Token is invalid or unregistered — mark for removal
                const code = err?.errorInfo?.code || '';
                if (
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/invalid-argument'
                ) {
                    failedTokens.push(token);
                } else {
                    console.error(`[FCM] Unexpected error for token ${token.slice(0, 20)}…:`, err.message);
                }
            }
        })
    );

    return { successCount, failedTokens };
}

module.exports = { sendPushToTokens };
