import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Initialize from localStorage if available
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user_session');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (role) => {
        let userData;
        // Mock login logic
        if (role === 'admin') {
            userData = { name: 'Admin User', role: 'Admin' };
        } else {
            userData = { name: 'Staff Member', role: 'Staff' };
        }
        setUser(userData);
        localStorage.setItem('user_session', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user_session');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
