import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
    // navigator.onLine is usually available immediately
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 'env(safe-area-inset-bottom, 1rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--danger)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '99px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow)',
            zIndex: 9999
        }}>
            <WifiOff size={16} /> No internet. Try again.
        </div>
    );
}
