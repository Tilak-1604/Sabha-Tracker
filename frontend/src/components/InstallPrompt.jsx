import React, { useState, useEffect } from 'react';

/**
 * Returns true if the app is already running as an installed PWA.
 */
function isStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        // If already installed, never show
        if (isStandalone()) return;

        // Not installed -- always show the modal
        setShowBanner(true);

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault(); // Prevent the browser mini-infobar
            setDeferredPrompt(e); // Store it for the button click
        };

        const handleAppInstalled = () => {
            setShowBanner(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Native browser prompt is available — use it
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        } else {
            // Prompt not available (Safari iOS, already dismissed, etc.) — show manual instructions
            setShowManual(true);
        }
    };

    if (!showBanner) return null;

    return (
        <>
            {/* Dark overlay */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                zIndex: 9998,
            }} />

            {/* Modal card */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 2rem)',
                maxWidth: '420px',
                background: 'linear-gradient(135deg, var(--brand), var(--brand-dk))',
                borderRadius: 'var(--radius)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.75rem 1.5rem',
                gap: '1rem',
                boxShadow: '0 16px 48px hsla(250, 75%, 15%, 0.7)',
                zIndex: 9999,
            }}>
                <div style={{ fontSize: '2.5rem' }}>📲</div>

                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 700 }}>
                        Install Sabha Tracker
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.5 }}>
                        Install the app on your device to receive reminders and access it like a native app — no browser needed.
                    </p>
                </div>

                {showManual ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.85rem 1rem',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        textAlign: 'left',
                        width: '100%',
                    }}>
                        <strong>Manual steps:</strong>
                        <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                            <li><strong>Android/Chrome:</strong> Tap ⋮ menu → "Add to Home screen"</li>
                            <li><strong>iPhone/Safari:</strong> Tap Share (□↑) → "Add to Home Screen"</li>
                        </ol>
                    </div>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        style={{
                            background: '#fff',
                            color: 'var(--brand-dk)',
                            border: 'none',
                            padding: '0.8rem 2rem',
                            borderRadius: 'var(--radius)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            width: '100%',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                        }}
                    >
                        Install App Now
                    </button>
                )}
            </div>
        </>
    );
}
