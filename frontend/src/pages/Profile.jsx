import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, KeyRound } from 'lucide-react';

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = () => {
        setLoggingOut(true);
        logout();
        navigate('/login', { replace: true });
    };

    if (!user) return null;

    return (
        <div className="page" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
                <h1 className="page-title">My Profile</h1>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'hsla(250, 75%, 62%, 0.15)',
                        color: 'var(--brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <User size={32} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>{user.name}</h2>
                        <p style={{ color: 'var(--text-2)' }}>{user.rollNo}</p>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>Room Number</p>
                        <p style={{ fontSize: '1rem', fontWeight: 500 }}>{user.roomNo || 'Not specified'}</p>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border)' }} />

                <div className="form-stack">
                    <Link to="/change-password" className="btn btn-ghost btn-full" style={{ justifyContent: 'flex-start' }}>
                        <KeyRound size={18} />
                        Change Password
                    </Link>

                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="btn btn-danger btn-full"
                        style={{ marginTop: '0.5rem' }}
                    >
                        {loggingOut ? (
                            <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff' }} /> Logging out…</>
                        ) : (
                            <><LogOut size={18} /> Log Out</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
