import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function getISTToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function toYYYYMMFromDateStr(dateStr) {
  return dateStr.slice(0, 7);
}

export default function CheshtaPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(getISTToday());
  const [month, setMonth] = useState(() => toYYYYMMFromDateStr(getISTToday()));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [statusLoading, setStatusLoading] = useState(true);
  const [chesthaStatus, setCheshtaStatus] = useState(null);

  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/cheshta/status');
      if (!data.showCheshtaUI) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setCheshtaStatus(data);
    } catch (err) {
      console.error("Failed to load cheshta status", err);
    } finally {
      setStatusLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const fetchLogs = useCallback(async (m) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/cheshta?month=${m}`);
      setLogs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Cheshta entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(month);
  }, [month, fetchLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/cheshta/add', { date });
      addToast('Cheshta recorded', 'success');
      setMonth(toYYYYMMFromDateStr(date));
      fetchLogs(toYYYYMMFromDateStr(date));
      fetchStatus(); // Refresh status to update pending count
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Only 1 Cheshta allowed per day');
        addToast('Only 1 Cheshta allowed per day', 'error');
      } else {
        const msg = err.response?.data?.message || 'Failed to add Cheshta.';
        setError(msg);
        addToast(msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Cheshta entry?')) return;
    try {
      await api.delete(`/cheshta/${id}`);
      addToast('Cheshta entry deleted', 'success');
      fetchLogs(month);
      fetchStatus(); // Refresh status immediately
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete Cheshta entry.', 'error');
    }
  };

  const totalThisMonth = logs.length;
  const hasLogForSelectedDate = logs.some((l) => l.date === date);

  if (statusLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="page">
        <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">Cheshta</h1>
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
            background: chesthaStatus?.pendingCheshtaRequiredTotal > 0 ? 'hsla(30,90%,60%,0.1)' : 'hsla(120,60%,50%,0.1)',
            borderColor: chesthaStatus?.pendingCheshtaRequiredTotal > 0 ? 'hsla(30,90%,60%,0.4)' : 'hsla(120,60%,50%,0.4)',
          }}
        >
          {chesthaStatus?.pendingCheshtaRequiredTotal > 0 ? (
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--warning-dark, #b45309)' }}>
              Pending Cheshta: {chesthaStatus.pendingCheshtaRequiredTotal}
            </h3>
          ) : (
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--success-dark, #15803d)' }}>
              All set ✅ Your short leave is activated.
            </h3>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.35rem' }}>
            Cheshta are extra sabha attendances you do after returning from a short leave.
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
            When you complete enough Cheshta, small leaves (≤ 6 sessions) get fully blocked — those sabhas won&apos;t count for fine.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="cheshta-date">Date</label>
              <input
                id="cheshta-date"
                type="date"
                value={date}
                max={getISTToday()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {hasLogForSelectedDate && (
              <p style={{ fontSize: '0.8rem', color: 'var(--warning)', margin: '0 0 0.5rem 0' }}>
                You have already added a Cheshta for this date.
              </p>
            )}

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={saving || hasLogForSelectedDate}
            >
              {saving ? 'Saving…' : 'Add Cheshta'}
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
            <p className="calendar-section-title">Cheshta log — {month}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
              Total this month: <strong>{totalThisMonth}</strong>
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner" />
            </div>
          ) : logs.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
              No Cheshta recorded for this month.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.map((l) => (
                <div
                  key={l._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.4rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{l.date}</span>
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

