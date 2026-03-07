import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    useEffect(() => {
        const root = document.documentElement;
        // Enforce dark theme only
        root.classList.remove('theme-light');
        localStorage.setItem('tracker-theme', 'dark');

        // Update the meta theme-color dynamically for PWA
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', '#101114'); // Corresponds to standard dark background color
        }
    }, []);

    // No-op for compatibility
    const toggleTheme = () => { };

    return (
        <ThemeContext.Provider value={{ theme: 'dark', toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
