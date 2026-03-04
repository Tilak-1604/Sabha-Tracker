/**
 * Firebase Cloud Messaging Service Worker — Hostel Sabha Tracker
 *
 * NOTE: Push notifications require HTTPS in production.
 *       localhost is allowed as an exception during development.
 *
 * Verify this file is reachable at: https://your-domain.com/firebase-messaging-sw.js
 */

// Import Firebase compat scripts (must use compat CDN inside service workers)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyCFCedDCjHIEgif1BHxoMUJuRf9_FVCGVY',
    authDomain: 'sabha-tracker-51f8b.firebaseapp.com',
    projectId: 'sabha-tracker-51f8b',
    storageBucket: 'sabha-tracker-51f8b.firebasestorage.app',
    messagingSenderId: '1027792326563',
    appId: '1:1027792326563:web:ae43fc1d057d0c9f791416',
});

const messaging = firebase.messaging();

/**
 * Handle background messages (when the app tab is closed or in background).
 * Foreground messages are handled by the app itself via onMessage().
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const { title, body } = payload.notification || {};
    const notificationTitle = title || 'Hostel Tracker Reminder';
    const notificationBody = body || '';

    self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'hostel-reminder',       // replaces previous notification (no stacking)
        renotify: false,
        requireInteraction: false,
        data: { url: '/dashboard' },
    });
});

/**
 * On notification click — open (or focus) the dashboard tab.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(targetUrl) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
