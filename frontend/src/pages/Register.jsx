import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TextInput from '../components/TextInput';
import PasswordInput from '../components/PasswordInput';
import FormErrorBanner from '../components/FormErrorBanner';

export default function Register() {
    const [form, setForm] = useState({ name: '', rollNo: '', roomNo: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            login(data);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0]?.msg ||
                'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-box">
                <p className="auth-logo">🏫 Sabha Tracker</p>
                <div>
                    <h1 className="auth-title">Create account</h1>
                    <p className="auth-sub" style={{ marginTop: '0.35rem' }}>
                        Register to start tracking your hostel sabha attendance
                    </p>
                </div>

                <form className="form-stack" onSubmit={handleSubmit}>
                    <FormErrorBanner error={error} />

                    <TextInput
                        label="Full Name"
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your full name"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                        required
                    />

                    <TextInput
                        label="Roll Number"
                        id="rollNo"
                        name="rollNo"
                        type="text"
                        placeholder="e.g. CS2301"
                        value={form.rollNo}
                        onChange={handleChange}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        autoComplete="username"
                        required
                    />

                    <TextInput
                        label="Room Number"
                        id="roomNo"
                        name="roomNo"
                        type="text"
                        inputMode="text"
                        placeholder="e.g. A-204"
                        value={form.roomNo}
                        onChange={handleChange}
                        required
                    />

                    <PasswordInput
                        label="Password"
                        id="password"
                        name="password"
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={handleChange}
                        minLength={6}
                        autoComplete="new-password"
                        enterKeyHint="done"
                        required
                    />

                    {error && <p className="form-error">{error}</p>}

                    <button
                        id="register-submit"
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading && <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff', marginRight: '0.5rem' }} />}
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-sub">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
