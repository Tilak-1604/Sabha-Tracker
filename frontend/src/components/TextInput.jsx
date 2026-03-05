import React from 'react';

export default function TextInput({
    label,
    id,
    error,
    ...props
}) {
    return (
        <div className="form-group">
            {label && <label htmlFor={id}>{label}</label>}
            <input
                id={id}
                className={error ? 'input-error' : ''}
                {...props}
            />
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}
