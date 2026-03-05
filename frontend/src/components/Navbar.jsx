import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { User } from 'lucide-react';

export default function Navbar() {
    const { user } = useAuth();
    const [showCheshtaUI, setShowCheshtaUI] = useState(false);

    useEffect(() => {
        if (user) {
            api.get('/cheshta/status')
                .then(res => {
                    setShowCheshtaUI(res.data.showCheshtaUI);
                })
                .catch(err => console.error("Failed to load cheshta status for navbar", err));
        }
    }, [user]);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <span className="navbar-brand">🏫 Sabha Tracker</span>

                <div className="navbar-links">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    >
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/mark"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    >
                        Mark Attendance
                    </NavLink>
                    <NavLink
                        to="/leave"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    >
                        Leave
                    </NavLink>
                    {showCheshtaUI && (
                        <NavLink
                            to="/cheshta"
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        >
                            Cheshta
                        </NavLink>
                    )}
                </div>

                <div className="navbar-user">
                    <Link to="/profile" className="user-chip-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                        <div className="user-chip">
                            <span className="user-chip-name">{user?.name}</span>
                            <span className="user-chip-roll">{user?.rollNo} · Room {user?.roomNo}</span>
                        </div>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'hsla(250, 75%, 62%, 0.15)',
                            color: 'var(--brand)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <User size={18} />
                        </div>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
