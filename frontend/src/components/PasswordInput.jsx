import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
    label,
    id,
    error,
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);

    const togglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <div className="form-group">
            {label && <label htmlFor={id}>{label}</label>}
            <div className="password-input-wrapper">
                <input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    className={`password-input ${error ? 'input-error' : ''}`}
                    {...props}
                />
                <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={togglePassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex="-1"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}
