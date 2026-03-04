import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
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

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

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
                    <div className="user-chip">
                        <span className="user-chip-name">{user?.name}</span>
                        <span className="user-chip-roll">{user?.rollNo} · Room {user?.roomNo}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
