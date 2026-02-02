import React, { useState, useEffect } from 'react';
import { Moon, Sun, Type } from 'lucide-react';

const Settings = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [fontSize, setFontSize] = useState('16px');

    // Load saved settings
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const savedFont = localStorage.getItem('fontSize');

        if (savedTheme === 'dark') {
            setDarkMode(true);
            document.body.classList.add('dark-mode');
        }

        if (savedFont) {
            setFontSize(savedFont);
            document.documentElement.style.setProperty('--base-font-size', savedFont);
        }
    }, []);

    // Handle Theme Change
    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);

        if (newMode) {
            document.body.classList.add('dark-mode');
            document.documentElement.style.setProperty('--background', '#1e293b');
            document.documentElement.style.setProperty('--surface', '#334155');
            document.documentElement.style.setProperty('--text-main', '#f8fafc');
            document.documentElement.style.setProperty('--text-muted', '#94a3b8');
            document.documentElement.style.setProperty('--border', '#475569');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.style.setProperty('--background', '#f8fafc');
            document.documentElement.style.setProperty('--surface', '#ffffff');
            document.documentElement.style.setProperty('--text-main', '#1e293b');
            document.documentElement.style.setProperty('--text-muted', '#64748b');
            document.documentElement.style.setProperty('--border', '#e2e8f0');
            localStorage.setItem('theme', 'light');
        }
    };

    // Handle Font Change
    const handleFontChange = (e) => {
        const size = e.target.value + 'px';
        setFontSize(size);
        // Assuming we update root font size or body
        document.body.style.fontSize = size;
        localStorage.setItem('fontSize', size);
    };

    return (
        <div>
            <h1>Settings</h1>

            <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Appearance</h3>

                {/* Theme Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ padding: '10px', background: darkMode ? '#475569' : '#e2e8f0', borderRadius: '50%' }}>
                            {darkMode ? <Moon size={24} color="#f8fafc" /> : <Sun size={24} color="#f59e0b" />}
                        </div>
                        <div>
                            <div style={{ fontWeight: '600' }}>App Theme</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{darkMode ? 'Dark Mode' : 'Light Mode'}</div>
                        </div>
                    </div>
                    <button className="btn" onClick={toggleTheme} style={{ border: '1px solid var(--border)' }}>
                        Switch to {darkMode ? 'Light' : 'Dark'}
                    </button>
                </div>

                <div style={{ height: '1px', background: 'var(--border)', marginBottom: '2rem' }}></div>

                {/* Font Size */}
                <div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ padding: '10px', background: darkMode ? '#475569' : '#e2e8f0', borderRadius: '50%' }}>
                            <Type size={24} color="var(--text-main)" />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600' }}>Font System</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Adjust global font size</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '14px' }}>A</span>
                        <input
                            type="range"
                            min="14"
                            max="20"
                            value={parseInt(fontSize)}
                            onChange={handleFontChange}
                            style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '20px' }}>A</span>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Current Size: {fontSize}
                    </div>
                </div>

            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                App Version 1.2.0 • Build 2026.02.01
            </div>
        </div>
    );
};

export default Settings;
