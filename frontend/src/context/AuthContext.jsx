import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    // Rehydrate session on mount — verify token is still valid
    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const { data } = await api.get('/auth/me');
                setUser(data);
                localStorage.setItem('user', JSON.stringify(data));
            } catch {
                // Token is invalid or expired; clear everything
                setUser(null);
                setToken(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const login = useCallback((data) => {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }, []);

    const isAuthenticated = Boolean(token && user);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
