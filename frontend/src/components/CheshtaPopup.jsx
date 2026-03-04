import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function getISTToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function CheshtaPopup({ statusData }) {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!statusData) return;

        const {
            hasPendingSmallLeave,
            pendingCheshtaRequiredTotal,
            nextPendingLeaveInfo,
        } = statusData;

        if (!hasPendingSmallLeave || pendingCheshtaRequiredTotal <= 0 || !nextPendingLeaveInfo) {
            setIsVisible(false);
            return;
        }

        const todayIST = getISTToday();

        // Popup should show only if today IST > leave end date
        if (todayIST <= nextPendingLeaveInfo.leaveEndDate) {
            setIsVisible(false);
            return;
        }

        // Check localStorage for dismissal
        const dismissedStr = localStorage.getItem('cheshtaPopupDismissed');
        if (dismissedStr) {
            try {
                const dismissed = JSON.parse(dismissedStr);
                const now = Date.now();

                const isSameLeave = dismissed.leaveId === nextPendingLeaveInfo.leaveId;
                const isSameCount = dismissed.remainingCheshta === nextPendingLeaveInfo.remainingCheshta;
                const isExpired = now > dismissed.until;

                // Only hide if it's the SAME leave requirement AND timer hasn't expired
                if (isSameLeave && isSameCount && !isExpired) {
                    setIsVisible(false);
                    return;
                }
            } catch (e) {
                // bad format, ignore
            }
        }

        setIsVisible(true);
    }, [statusData]);

    const handleDismiss = () => {
        if (!statusData || !statusData.nextPendingLeaveInfo) return;

        const dismissData = {
            until: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            leaveId: statusData.nextPendingLeaveInfo.leaveId,
            remainingCheshta: statusData.nextPendingLeaveInfo.remainingCheshta,
        };

        localStorage.setItem('cheshtaPopupDismissed', JSON.stringify(dismissData));
        setIsVisible(false);
    };

    const handleAction = () => {
        navigate('/cheshta');
    };

    if (!isVisible || !statusData || !statusData.nextPendingLeaveInfo) return null;

    return (
        <div
            style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--danger)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: 'var(--shadow-sm)'
            }}
        >
            <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-1)' }}>Cheshta Pending</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-2)' }}>
                    You still need <strong>{statusData.nextPendingLeaveInfo.remainingCheshta}</strong> Cheshta to approve your leave. Until then, fine will be added.
                </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAction}>
                    Add Cheshta Now
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleDismiss}>
                    Dismiss
                </button>
            </div>
        </div>
    );
}
