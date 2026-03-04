import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import CheshtaPopup from '../components/CheshtaPopup';

function getISTToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function toYYYYMMFromDateStr(dateStr) {
    return dateStr.slice(0, 7);
}

function toTodayStr() {
    return getISTToday();
}

export default function MarkAttendance() {
    const [date, setDate] = useState(toTodayStr());
    const [morning, setMorning] = useState(null);   // 'present' | 'absent' | null
    const [evening, setEvening] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [cheshtaStatus, setCheshtaStatus] = useState(null);

    const addToast = (msg, type = 'success') => {
        const id = Date.now();
        setToasts((t) => [...t, { id, msg, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    };

    const fetchRecord = useCallback(async (d) => {
        try {
            const { data } = await api.get(`/attendance/day?date=${d}`);
            setMorning(data.morning);
            setEvening(data.evening);
        } catch {
            setMorning(null);
            setEvening(null);
        }
    }, []);

    const fetchLeavesForMonth = useCallback(async (d) => {
        const month = toYYYYMMFromDateStr(d);
        try {
            const { data } = await api.get(`/leave?month=${month}`);
            setLeaves(data);
        } catch {
            setLeaves([]);
        }
    }, []);

    const fetchCheshtaStatus = useCallback(async () => {
        try {
            const { data } = await api.get('/cheshta/status');
            setCheshtaStatus(data);
        } catch {
            setCheshtaStatus(null);
        }
    }, []);

    useEffect(() => {
        fetchRecord(date);
        fetchLeavesForMonth(date);
    }, [date, fetchRecord, fetchLeavesForMonth]);

    useEffect(() => {
        fetchCheshtaStatus();
    }, [fetchCheshtaStatus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/attendance/upsert', { date, morning, evening });
            addToast('Attendance saved successfully!', 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to save attendance.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const isBlocked = useCallback((d, session) => {
        const toKey = (dateStr, sess) => {
            const [y, m, day] = dateStr.split('-').map(Number);
            const base = Math.floor(Date.UTC(y, m - 1, day) / 86400000) * 2;
            const offset = sess === 'evening' ? 1 : 0;
            return base + offset;
        };
        const key = toKey(d, session);
        return leaves.some((l) => {
            if (!l.isActiveLeaveBlocking) return false; // NOTE: INACTIVE LEAVES DO NOT BLOCK MARKING
            const start = toKey(l.fromDate, l.fromSession);
            const end = toKey(l.toDate, l.toSession);
            return key >= start && key <= end;
        });
    }, [leaves]);

    const Toggle = ({ label, value, onChange, blocked }) => (
        <div className="form-group">
            <label>{label}</label>
            <div className="toggle-group">
                <button
                    id={`${label.toLowerCase()}-present`}
                    type="button"
                    className={`toggle-btn${value === 'present' ? ' selected-present' : ''}`}
                    onClick={() => !blocked && onChange(value === 'present' ? null : 'present')}
                    disabled={blocked}
                >
                    ✓ Present
                </button>
                <button
                    id={`${label.toLowerCase()}-absent`}
                    type="button"
                    className={`toggle-btn${value === 'absent' ? ' selected-absent' : ''}`}
                    onClick={() => !blocked && onChange(value === 'absent' ? null : 'absent')}
                    disabled={blocked}
                >
                    ✗ Absent
                </button>
            </div>
            {blocked ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                    Blocked (Leave)
                </p>
            ) : value === null && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                    Not marked — tap Present or Absent
                </p>
            )}
        </div>
    );

    return (
        <>
            <div className="page mark-page">
                <CheshtaPopup statusData={cheshtaStatus} />

                <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
                    <h1 className="page-title">Mark Attendance</h1>
                </div>

                <div className="card">
                    <form className="form-stack" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="att-date">Date</label>
                            <input
                                id="att-date"
                                type="date"
                                value={date}
                                max={toTodayStr()}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <Toggle
                            label="Morning Sabha"
                            value={morning}
                            onChange={setMorning}
                            blocked={isBlocked(date, 'morning')}
                        />

                        <Toggle
                            label="Evening Sabha"
                            value={evening}
                            onChange={setEvening}
                            blocked={isBlocked(date, 'evening')}
                        />

                        <div style={{ paddingTop: '0.5rem' }}>
                            <button
                                id="submit-attendance"
                                type="submit"
                                className="btn btn-primary btn-full"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving…' : 'Save Attendance'}
                            </button>
                        </div>
                    </form>
                </div>

                <div
                    className="card"
                    style={{ marginTop: '1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}
                >
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                            Current record for {date}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>
                            ☀️ Morning:{' '}
                            <strong style={{ color: morning === 'present' ? 'var(--safe)' : morning === 'absent' ? 'var(--danger)' : 'var(--text-3)' }}>
                                {morning ?? 'Not marked'}
                            </strong>
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>
                            🌙 Evening:{' '}
                            <strong style={{ color: evening === 'present' ? 'var(--safe)' : evening === 'absent' ? 'var(--danger)' : 'var(--text-3)' }}>
                                {evening ?? 'Not marked'}
                            </strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* Toast Area */}
            <div className="toast-area">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        {t.msg}
                    </div>
                ))}
            </div>
        </>
    );
}
