import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [form, setForm] = useState({ rollNo: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', form);
            login(data);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-box">
                <p className="auth-logo">🏫 Sabha Tracker</p>
                <div>
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-sub" style={{ marginTop: '0.35rem' }}>
                        Sign in to track your attendance
                    </p>
                </div>

                <form className="form-stack" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="rollNo">Roll Number</label>
                        <input
                            id="rollNo"
                            name="rollNo"
                            type="text"
                            placeholder="e.g. CS2301"
                            value={form.rollNo}
                            onChange={handleChange}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <button
                        id="login-submit"
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-sub">
                    Don&apos;t have an account?{' '}
                    <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}
