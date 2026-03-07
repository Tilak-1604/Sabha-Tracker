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
        <>
            {/* Dark overlay backdrop to draw attention */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                zIndex: 9998
            }} />

            {/* Prominent Modal */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 2rem)',
                maxWidth: '400px',
                background: 'linear-gradient(135deg, var(--brand), var(--brand-dk))',
                borderRadius: 'var(--radius)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.5rem',
                gap: '1rem',
                boxShadow: '0 12px 32px hsla(250, 75%, 20%, 0.6)',
                zIndex: 9999
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Install App Required</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                        To receive notifications and use the app optimally, please install it to your home screen.
                    </p>
                </div>
                <button
                    onClick={handleInstallClick}
                    style={{
                        background: '#fff',
                        color: 'var(--brand-dk)',
                        border: 'none',
                        padding: '0.75rem 2rem',
                        borderRadius: 'var(--radius)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                >
                    Install App Now
                </button>
            </div>
        </>
    );
}
