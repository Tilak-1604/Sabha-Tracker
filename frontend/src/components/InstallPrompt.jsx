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
        // Already installed — never show
        if (isStandalone()) return;

        // User dismissed this session — respect it until next browser session
        if (sessionStorage.getItem('install-dismissed') === '1') return;

        // Not installed, not dismissed — show the banner
        setShowBanner(true);

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault(); // prevent mini-infobar
            setDeferredPrompt(e);
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

    const handleDismiss = () => {
        // Hide for this session only — reappears when user opens the browser again
        sessionStorage.setItem('install-dismissed', '1');
        setShowBanner(false);
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        } else {
            // No native prompt available (iOS / already dismissed) — show manual steps
            setShowManual(true);
        }
    };

    if (!showBanner) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '1.25rem',
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
            padding: '1.1rem 1.1rem 1.1rem',
            gap: '0.75rem',
            boxShadow: '0 8px 32px hsla(250, 75%, 15%, 0.55)',
            zIndex: 9000,
        }}>
            {/* Header row with title + dismiss ✕ */}
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.95rem' }}>
                        📲 Install Sabha Tracker
                    </p>
                    <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.88, lineHeight: 1.4 }}>
                        Install for faster access and push reminders.
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss install prompt"
                    style={{
                        background: 'rgba(255,255,255,0.18)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        lineHeight: '26px',
                        textAlign: 'center',
                        padding: 0,
                    }}
                >
                    ✕
                </button>
            </div>

            {showManual ? (
                <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    textAlign: 'left',
                    width: '100%',
                }}>
                    <strong>How to install:</strong>
                    <ol style={{ margin: '0.25rem 0 0', paddingLeft: '1rem' }}>
                        <li><strong>Android:</strong> Tap ⋮ menu → "Add to Home screen"</li>
                        <li><strong>iPhone:</strong> Tap Share (□↑) → "Add to Home Screen"</li>
                    </ol>
                </div>
            ) : (
                <button
                    onClick={handleInstallClick}
                    style={{
                        background: '#fff',
                        color: 'var(--brand-dk)',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    }}
                >
                    Install App
                </button>
            )}
        </div>
    );
}
