import { useState, useCallback, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, VAPID_KEY } from '../firebase';
import api from '../api/axios';

const LOCAL_STORAGE_KEY = 'fcm_push_token';

/**
 * Custom hook for managing FCM push notification opt-in/out.
 *
 * Returns:
 *  permissionStatus  – 'default' | 'granted' | 'denied' | 'unsupported'
 *  isEnabled         – whether this browser currently has a registered token
 *  isLoading         – async operation in progress
 *  enableNotifications()   – request permission → get token → register with backend
 *  disableNotifications()  – unregister token from backend → clear
 */
export function usePushNotifications() {
    const [permissionStatus, setPermissionStatus] = useState(() => {
        if (typeof Notification === 'undefined') return 'unsupported';
        return Notification.permission;
    });
    const [isEnabled, setIsEnabled] = useState(() => !!localStorage.getItem(LOCAL_STORAGE_KEY));
    const [isLoading, setIsLoading] = useState(false);

    // Keep permissionStatus in sync if the user changes browser settings externally
    useEffect(() => {
        if (typeof Notification === 'undefined') return;
        setPermissionStatus(Notification.permission);
    }, []);

    // Handle foreground messages (show a simple browser notification)
    useEffect(() => {
        if (typeof Notification === 'undefined' || !isEnabled) return;
        try {
            const unsub = onMessage(messaging, (payload) => {
                const { title, body } = payload.notification || {};
                if (Notification.permission === 'granted') {
                    new Notification(title || 'Hostel Tracker', { body });
                }
            });
            return () => unsub();
        } catch {
            // messaging init may fail if config is not yet filled in
        }
    }, [isEnabled]);

    const enableNotifications = useCallback(async () => {
        if (typeof Notification === 'undefined') {
            alert('Push notifications are not supported in this browser.');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Request permission
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission !== 'granted') {
                return; // user denied — nothing to do
            }

            // 2. Explicitly register Firebase service worker for messaging
            const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

            // 3. Get FCM token using the explicit registration
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration,
            });

            if (!token) {
                throw new Error('Failed to obtain FCM token. Check your Firebase config and VAPID key.');
            }

            // 4. Send token to backend
            await api.post('/push/register', {
                token,
                deviceLabel: navigator.userAgent.slice(0, 100),
            });

            // 5. Persist locally (idempotent re-registration)
            localStorage.setItem(LOCAL_STORAGE_KEY, token);
            setIsEnabled(true);
        } catch (err) {
            console.error('[Push] enableNotifications error:', err);
            alert(`Could not enable notifications: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const disableNotifications = useCallback(async () => {
        const token = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!token) {
            setIsEnabled(false);
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/push/unregister', { token });
        } catch (err) {
            console.error('[Push] disableNotifications error:', err);
        } finally {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setIsEnabled(false);
            setIsLoading(false);
        }
    }, []);

    return {
        permissionStatus,
        isEnabled,
        isLoading,
        enableNotifications,
        disableNotifications,
    };
}
