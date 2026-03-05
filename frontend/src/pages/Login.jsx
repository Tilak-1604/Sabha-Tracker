import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TextInput from '../components/TextInput';
import PasswordInput from '../components/PasswordInput';
import FormErrorBanner from '../components/FormErrorBanner';

export default function Login() {
    const [form, setForm] = useState({ rollNo: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
        setError(''); // Clear global an API error when typed
    };

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
                    <FormErrorBanner error={error} />

                    <TextInput
                        label="Roll Number"
                        id="rollNo"
                        name="rollNo"
                        type="text"
                        placeholder="e.g. CS2301"
                        value={form.rollNo}
                        onChange={handleChange}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        required
                    />

                    <PasswordInput
                        label="Password"
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                        enterKeyHint="done"
                        required
                    />

                    <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                            Forgot password? Contact hostel office to reset.
                        </span>
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <button
                        id="login-submit"
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading && <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff', marginRight: '0.5rem' }} />}
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
