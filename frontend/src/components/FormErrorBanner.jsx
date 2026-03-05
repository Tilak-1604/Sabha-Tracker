import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function FormErrorBanner({ error }) {
    if (!error) return null;

    return (
        <div className="form-error-banner">
            <AlertCircle size={18} className="form-error-icon" />
            <span>{error}</span>
        </div>
    );
}
