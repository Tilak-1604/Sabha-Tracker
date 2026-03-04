import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import FineBar from '../components/FineBar';
import CheshtaPopup from '../components/CheshtaPopup';
import NotificationBanner from '../components/NotificationBanner';

// ─── helpers ─────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getISTToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function toYYYYMMFromDateStr(dateStr) {
    return dateStr.slice(0, 7);
}

function fmtDate(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${y}`;
}

const RULE_LABELS = {
    ALL_DAYS_20: '≥ threshold → ₹20 × days',
    ALL_DAYS_10: 'Near threshold → ₹10 × days',
    ABSENT_ONLY_3: 'Below threshold → ₹3 × absent days',
};

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

function CalendarGrid({ month, history, countedUntilDate, leaves }) {
    const [year, mo] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mo, 0).getDate();
    const firstDay = new Date(year, mo - 1, 1).getDay();
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const monthStart = `${month}-01`;

    const lookup = {};
    history.forEach((r) => { lookup[r.date] = r; });

    const toKey = (dateStr, sess) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const base = Math.floor(Date.UTC(y, m - 1, d) / 86400000) * 2;
        const offset = sess === 'evening' ? 1 : 0;
        return base + offset;
    };

    const leaveRanges = (leaves || []).map((l) => ({
        start: toKey(l.fromDate, l.fromSession),
        end: toKey(l.toDate, l.toSession),
    }));

    const isSessionBlocked = (dateStr, session) => {
        const key = toKey(dateStr, session);
        return leaveRanges.some((r) => key >= r.start && key <= r.end);
    };

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const record = lookup[dateStr] || null;

        // A day is "missing" if it falls inside the counted range but has no entry at all
        // (or both morning and evening are null)
        const inCountedRange =
            countedUntilDate &&
            dateStr >= monthStart &&
            dateStr <= countedUntilDate;
        const hasEntry = record && (record.morning !== null || record.evening !== null);
        const isMissing = inCountedRange && !hasEntry;

        const morningBlocked = isSessionBlocked(dateStr, 'morning');
        const eveningBlocked = isSessionBlocked(dateStr, 'evening');
        const hasLeave = morningBlocked || eveningBlocked;

        cells.push({ day: d, dateStr, record, isMissing, hasLeave, morningBlocked, eveningBlocked });
    }

    return (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
            <p className="calendar-section-title">Daily Log — {month}</p>
            <div className="calendar-grid">
                {WEEK_DAYS.map((d) => (
                    <div key={d} className="cal-day-header">{d}</div>
                ))}
                {cells.map((c) =>
                    c.empty ? (
                        <div key={c.key} className="cal-day empty" />
                    ) : (() => {
                        const isFuture = countedUntilDate && c.dateStr > countedUntilDate;
                        return (
                            <div
                                key={c.dateStr}
                                className={[
                                    'cal-day',
                                    c.dateStr === todayStr ? 'today' : '',
                                    c.hasLeave ? 'leave' : '',
                                ].filter(Boolean).join(' ')}
                                style={{
                                    opacity: isFuture ? 0.3 : 1,
                                    ...(c.isMissing
                                        ? {
                                            border: '1px solid hsla(38,95%,52%,0.55)',
                                            background: 'hsla(38,95%,52%,0.07)',
                                        }
                                        : {}),
                                }}
                                title={
                                    c.hasLeave
                                        ? 'On leave (one or both sessions blocked)'
                                        : c.isMissing
                                            ? 'Not marked — counts as missing'
                                            : undefined
                                }
                            >
                                <span>{c.day}</span>
                                {c.hasLeave && (
                                    <span className="cal-badge-leave">
                                        L
                                    </span>
                                )}
                                {!c.hasLeave && c.isMissing && (
                                    <span style={{ fontSize: '0.55rem', color: 'var(--warning)', fontWeight: 700, lineHeight: 1 }}>
                                        !
                                    </span>
                                )}
                                {!c.hasLeave && !c.isMissing && (
                                    <div className="cal-dots">
                                        <div
                                            className={`cal-dot ${c.record?.morning || ''}`}
                                            title={`Morning: ${c.record?.morning || 'unmarked'}`}
                                        />
                                        <div
                                            className={`cal-dot ${c.record?.evening || ''}`}
                                            title={`Evening: ${c.record?.evening || 'unmarked'}`}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })()
                )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-3)', flexWrap: 'wrap' }}>
                <span><span style={{ color: 'var(--safe)' }}>●</span> Present</span>
                <span><span style={{ color: 'var(--danger)' }}>●</span> Absent</span>
                <span><span style={{ color: 'var(--text-3)' }}>●</span> Unmarked</span>
                <span style={{ border: '1px solid hsla(38,95%,52%,0.55)', borderRadius: 3, padding: '0 4px', color: 'var(--warning)' }}>! Missing</span>
                <span style={{ borderRadius: 3, padding: '0 4px', background: 'hsla(145,60%,45%,0.15)', color: 'var(--safe)', border: '1px solid hsla(145,60%,45%,0.5)' }}>L Leave</span>
                <span style={{ marginLeft: 'auto' }}>Left = Morning · Right = Evening</span>
            </div>
        </div>
    );
}

// ─── SessionPanel ─────────────────────────────────────────────────────────────

function SessionPanel({ emoji, label, data, D }) {
    if (!data) return null;
    return (
        <div className="session-panel">
            <p className="session-title">{emoji} {label}</p>

            <div className="stat-grid">
                <StatCard
                    label="Present"
                    value={data.present}
                    sub={D > 0 ? `${data.presentPct}%` : '—'}
                />
                <StatCard
                    label="Absent"
                    value={data.absent}
                    sub={D > 0 ? `${data.absentPct}%` : '—'}
                />
                <StatCard label="Missing" value={data.missing} sub="not filled" />
                <StatCard label="Fine" value={`₹${data.fine}`} />
            </div>

            {D > 0 ? (
                <>
                    <FineBar
                        absentPct={data.absentPct}
                        level={data.level}
                        rule={RULE_LABELS[data.rule] || data.rule}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
                        Rule: <strong style={{ color: 'var(--text-2)' }}>{data.rule}</strong>
                    </p>
                </>
            ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
                    No counted days yet — mark attendance to see stats.
                </p>
            )}
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate();
    const [month, setMonth] = useState(() => toYYYYMMFromDateStr(getISTToday()));
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async (m) => {
        setLoading(true);
        setError('');
        try {
            const [dash, hist, leaveRes] = await Promise.all([
                api.get(`/dashboard?month=${m}`),
                api.get(`/attendance/history?month=${m}`),
                api.get(`/leave?month=${m}`),
            ]);
            setData(dash.data);
            setHistory(hist.data);
            setLeaves(leaveRes.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(month); }, [month, fetchData]);

    return (
        <div className="page">
            <CheshtaPopup statusData={data} />

            {/* ── Notification Banner ── */}
            <NotificationBanner />

            {/* ── Disclaimer Banner ── */}
            <div style={{
                background: 'hsla(38,95%,52%,0.1)',
                border: '1px solid hsla(38,95%,52%,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1rem',
                fontSize: '0.8rem',
                color: 'var(--warning)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}>
                ⚠️ <strong>Personal tracking only.</strong>&nbsp;Official hostel record is final.
            </div>

            {/* ── Header ── */}
            <div className="dashboard-header">
                <h1 className="page-title">My Dashboard</h1>
                <input
                    id="month-picker"
                    type="month"
                    className="month-picker"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    max={toYYYYMMFromDateStr(getISTToday())}
                />
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div className="card" style={{ color: 'var(--danger)', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {/* ── Main Content ── */}
            {!loading && !error && data && (
                <>
                    {/* Counting range info */}
                    <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                                Effective Days
                            </p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                                {data.effectiveMorningDays + data.effectiveEveningDays}
                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)', marginLeft: '0.4rem' }}>
                                    sessions
                                </span>
                            </p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                                Counted Till
                            </p>
                            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                                {fmtDate(data.countedUntilDate)}
                            </p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                                Leave‑Blocked
                            </p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-2)' }}>
                                M: {data.blockedMorningSessionsCount} · E: {data.blockedEveningSessionsCount}
                            </p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                                Fine Mode
                            </p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: data.fineMode === 'STRICT' ? 'var(--warning)' : 'var(--safe)' }}>
                                {data.fineMode}
                            </p>
                        </div>
                        {data.isCurrentMonth && data.D === 0 && (
                            <p style={{ fontSize: '0.83rem', color: 'var(--warning)', marginLeft: '0' }}>
                                ⚠️ No attendance marked yet this month. Go to&nbsp;
                                <a href="/mark" style={{ color: 'var(--brand-lt)' }}>Mark Attendance</a>.
                            </p>
                        )}
                    </div>

                    {/* Total Fine */}
                    <div className="total-fine-card">
                        <div>
                            <p className="fine-label">Total Fine — {month}</p>
                            <p className="fine-amount">₹{data.totalFine}</p>
                            {data.fineIncludesPendingShortLeave && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning-dark, #b45309)', background: 'hsla(30,90%,60%,0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid hsla(30,90%,60%,0.3)', width: 'fit-content' }}>
                                        Fine Added (Short leave pending Cheshta)
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 600 }}>
                                            Pending Cheshta: {data.pendingCheshtaRequiredTotal}
                                        </span>
                                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/cheshta')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', minHeight: 'unset' }}>
                                            Add Cheshta
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                                Morning ₹{data.morning.fine} · Evening ₹{data.evening.fine}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                                Rules: {data.morning.rule} / {data.evening.rule}
                            </p>
                        </div>
                    </div>

                    {/* Safe bunk remaining (current month only, when values present) */}
                    {data.isCurrentMonth &&
                        data.safeBunkMorningSessionsRemaining != null &&
                        data.safeBunkEveningSessionsRemaining != null && (
                            <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                                    Safe Bunks Left (to stay below ₹10 rule)
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '0.1rem' }}>Morning</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                                            {data.safeBunkMorningSessionsRemaining} <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>sessions</span>
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
                                            {data.morning10RuleThresholdMessage}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '0.1rem' }}>Evening</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                                            {data.safeBunkEveningSessionsRemaining} <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>sessions</span>
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
                                            {data.evening10RuleThresholdMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Short Leave Cheshta Status */}
                    {data.shortLeaveStatus && data.shortLeaveStatus.length > 0 && (
                        <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                                Short Leave Cheshta Status
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                                Cheshta this month: <strong>{data.cheshtaMonthTotal}</strong>
                            </p>
                            {data.totalInactiveShortLeaveSessions > 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                                    Leave not fully activated: attend more Cheshta so these short leaves stop counting for fine.
                                </p>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                                {data.shortLeaveStatus.map((s) => (
                                    <div key={s.leaveId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                            <span style={{ fontWeight: 600 }}>
                                                {s.fromDate} {s.fromSession} → {s.toDate} {s.toSession}
                                            </span>
                                            <span style={{ color: 'var(--text-2)' }}>
                                                Sessions: {s.leaveSessionsCount} · Required Cheshta: {s.requiredCheshta} · Completed: {s.cheshtaCompletedAfterReturn}
                                            </span>
                                            {!s.isActiveLeaveBlocking && (
                                                <span style={{ color: 'var(--warning)' }}>
                                                    Remaining Cheshta to activate: {s.remainingCheshtaToActivate}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`badge ${s.isActiveLeaveBlocking ? 'badge-safe' : 'badge-warning'}`}>
                                            {s.isActiveLeaveBlocking ? 'Active' : 'Pending Cheshta'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Session panels */}
                    <div className="panel-grid">
                        <SessionPanel emoji="☀️" label="Morning Sabha" data={data.morning} D={data.D} />
                        <SessionPanel emoji="🌙" label="Evening Sabha" data={data.evening} D={data.D} />
                    </div>

                    {/* Calendar */}
                    <CalendarGrid
                        month={month}
                        history={history}
                        countedUntilDate={data.countedUntilDate}
                        leaves={leaves}
                    />
                </>
            )}
        </div>
    );
}
