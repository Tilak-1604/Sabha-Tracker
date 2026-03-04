/**
 * Firebase client-side initialization for Hostel Sabha Tracker
 */
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: 'AIzaSyCFCedDCjHIEgif1BHxoMUJuRf9_FVCGVY',
    authDomain: 'sabha-tracker-51f8b.firebaseapp.com',
    projectId: 'sabha-tracker-51f8b',
    storageBucket: 'sabha-tracker-51f8b.firebasestorage.app',
    messagingSenderId: '1027792326563',
    appId: '1:1027792326563:web:ae43fc1d057d0c9f791416',
    measurementId: 'G-E8NWFE2GKL',
};

/**
 * Your Web Push certificate VAPID key.
 * Firebase Console → Project Settings → Cloud Messaging → Web Push Certificates
 */
export const VAPID_KEY =
    'BKW2qGky8LSHKSA9VFknNkcsOkbNkqOae-OlSN6VDqRPLbK1FlATZ6DICGIEY-NIzTDdL6IPbSJBmTbf8RhXoQw';

const app = initializeApp(firebaseConfig);

/**
 * Firebase Messaging instance.
 * Note: getMessaging() is only available in browser environments (not SSR).
 */
export const messaging = getMessaging(app);

export default app;
