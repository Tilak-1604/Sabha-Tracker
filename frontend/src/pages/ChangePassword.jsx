import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PasswordInput from '../components/PasswordInput';
import FormErrorBanner from '../components/FormErrorBanner';
import toast from 'react-hot-toast';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.newPassword !== form.confirmPassword) {
            return setError('New password and confirm password do not match.');
        }
        if (form.newPassword.length < 6) {
            return setError('New password must be at least 6 characters.');
        }

        setError('');
        setLoading(true);

        try {
            await api.post('/auth/change-password', {
                oldPassword: form.oldPassword,
                newPassword: form.newPassword
            });
            toast.success('Password changed successfully.');
            navigate('/profile', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page mark-page">
            <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
                <h1 className="page-title">Change Password</h1>
            </div>

            <div className="card">
                <form className="form-stack" onSubmit={handleSubmit}>
                    <FormErrorBanner error={error} />

                    <PasswordInput
                        label="Current Password"
                        id="oldPassword"
                        name="oldPassword"
                        placeholder="Enter current password"
                        value={form.oldPassword}
                        onChange={handleChange}
                        autoComplete="current-password"
                        required
                    />

                    <PasswordInput
                        label="New Password"
                        id="newPassword"
                        name="newPassword"
                        placeholder="Min 6 characters"
                        value={form.newPassword}
                        onChange={handleChange}
                        minLength={6}
                        autoComplete="new-password"
                        required
                    />

                    <PasswordInput
                        label="Confirm New Password"
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="Re-enter new password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        minLength={6}
                        autoComplete="new-password"
                        enterKeyHint="done"
                        required
                    />

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                        style={{ marginTop: '1rem' }}
                    >
                        {loading && <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff', marginRight: '0.5rem' }} />}
                        {loading ? 'Changing password…' : 'Update Password'}
                    </button>

                    <button
                        type="button"
                        className="btn btn-ghost btn-full"
                        onClick={() => navigate(-1)}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}
