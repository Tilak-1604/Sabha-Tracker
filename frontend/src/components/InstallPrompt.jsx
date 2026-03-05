import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app is already installed
        window.addEventListener('appinstalled', () => {
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowBanner(false);
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    if (!showBanner) return null;

    return (
        <div style={{
            margin: '1rem',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, var(--brand), var(--brand-dk))',
            borderRadius: 'var(--radius)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 4px 16px hsla(250, 75%, 50%, 0.3)'
        }}>
            <div>
                <p style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>Install Hostel Tracker</p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>One tap install, works like a native app</p>
            </div>
            <button
                onClick={handleInstallClick}
                style={{
                    background: '#fff',
                    color: 'var(--brand-dk)',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                }}
            >
                Install
            </button>
        </div>
    );
}
