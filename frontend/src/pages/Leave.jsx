import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

function getISTToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function toYYYYMMFromDateStr(dateStr) {
  return dateStr.slice(0, 7);
}

export default function LeavePage() {
  const [form, setForm] = useState(() => {
    const today = getISTToday();
    return {
      fromDate: today,
      fromSession: 'morning',
      toDate: today,
      toSession: 'evening',
      reason: '',
    };
  });
  const [month, setMonth] = useState(() => toYYYYMMFromDateStr(getISTToday()));
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const fetchLeaves = useCallback(async (targetMonth) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/leave?month=${targetMonth}`);
      setLeaves(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves(month);
  }, [month, fetchLeaves]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/leave/add', form);
      addToast('Leave added successfully', 'success');
      setMonth(toYYYYMMFromDateStr(form.fromDate));
      fetchLeaves(toYYYYMMFromDateStr(form.fromDate));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add leave.');
      addToast(err.response?.data?.message || 'Failed to add leave.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave record?')) return;
    try {
      await api.delete(`/leave/${id}`);
      addToast('Leave deleted', 'success');
      fetchLeaves(month);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete leave.', 'error');
    }
  };

  const monthLabel = useMemo(() => month, [month]);

  return (
    <>
      <div className="page">
        <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">Leave</h1>
          <input
            type="month"
            className="month-picker"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            max={toYYYYMMFromDateStr(getISTToday())}
          />
        </div>

        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            background: 'hsla(145,60%,45%,0.06)',
            borderColor: 'hsla(145,60%,45%,0.4)',
          }}
        >
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>
            Define hostel-approved leave so sabha sessions during that period are not counted as present,
            absent, or missing.
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
            Start and end are session-aware:&nbsp;
            <strong>morning</strong> blocks both sessions on that day, while <strong>evening</strong> blocks
            only that evening.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fromDate">From</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  value={form.fromDate}
                  onChange={handleChange}
                />
                <select
                  name="fromSession"
                  value={form.fromSession}
                  onChange={handleChange}
                  className="select-input"
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="toDate">To</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={form.toDate}
                  onChange={handleChange}
                />
                <select
                  name="toSession"
                  value={form.toSession}
                  onChange={handleChange}
                  className="select-input"
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason (optional)</label>
              <input
                id="reason"
                name="reason"
                type="text"
                placeholder="e.g. home visit / medical"
                value={form.reason}
                onChange={handleChange}
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Add Leave'}
            </button>
          </form>
        </div>

        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <p className="calendar-section-title">Leave for {monthLabel}</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner" />
            </div>
          ) : leaves.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
              No leave recorded for this month.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leaves.map((l) => (
                <div
                  key={l._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0.5rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      {l.fromDate} {l.fromSession} → {l.toDate} {l.toSession}
                    </span>
                    {l.reason && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                        {l.reason}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(l._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

