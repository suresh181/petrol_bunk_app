import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserCircle, ShieldCheck, Lock } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    // State for password input
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAdminClick = () => {
        setShowPasswordInput(true);
        setError('');
    };

    const handleStaffLogin = () => {
        login('user'); // Basic login for staff
        navigate('/dashboard');
    };

    const submitAdminLogin = () => {
        if (password === 'PPR&sons123') {
            login('admin');
            navigate('/dashboard');
        } else {
            setError('Invalid Password');
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #002F87 0%, #001e57 100%)'
        }}>
            <div className="card" style={{ width: '400px', textAlign: 'center', padding: '3rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src="https://iocl.com/assets/images/logo.gif" alt="Indian Oil" style={{ height: '70px', marginBottom: '1rem' }} />
                <h1 style={{ color: '#F37022', marginBottom: '0.5rem', fontSize: '1.8rem' }}>PPR & Sons</h1>
                <p style={{ color: '#94a3b8', marginBottom: '3rem' }}>Bunk Management System</p>

                {!showPasswordInput ? (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <button
                            className="btn"
                            style={{
                                padding: '1rem',
                                fontSize: '1rem',
                                background: 'white',
                                border: '2px solid #F37022',
                                color: '#F37022',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px'
                            }}
                            onClick={handleAdminClick}
                        >
                            <ShieldCheck size={24} />
                            <span>Login as Admin</span>
                        </button>

                        <button
                            className="btn"
                            style={{
                                padding: '1rem',
                                fontSize: '1rem',
                                background: 'white',
                                border: '2px solid #e2e8f0',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px'
                            }}
                            onClick={handleStaffLogin}
                        >
                            <UserCircle size={24} />
                            <span>Login as Staff</span>
                        </button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'left' }}>
                        <button
                            onClick={() => setShowPasswordInput(false)}
                            style={{ background: 'none', border: 'none', color: '#64748b', marginBottom: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            ← Back
                        </button>

                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>Enter Admin Password</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                                <input
                                    type="password"
                                    className="input"
                                    style={{ paddingLeft: '36px' }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    onKeyDown={(e) => e.key === 'Enter' && submitAdminLogin()}
                                    autoFocus
                                />
                            </div>
                            <button className="btn btn-primary" onClick={submitAdminLogin}>Login</button>
                        </div>
                        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
