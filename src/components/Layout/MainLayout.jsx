import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Fuel, Banknote, CalendarRange, Settings, LogOut, Users, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './MainLayout.css';

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showProfileCard, setShowProfileCard] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>PPR & Sons</h2>
                    <span className="badge">Bunk</span>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" className="nav-item">
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/fuel" className="nav-item">
                        <Fuel size={20} />
                        <span>Fuel & Nozzles</span>
                    </NavLink>

                    {/* Only Admin can see Shift Sales */}
                    {user?.role === 'Admin' && (
                        <NavLink to="/sales" className="nav-item">
                            <Banknote size={20} />
                            <span>Shift Sales</span>
                        </NavLink>
                    )}

                    <NavLink to="/credits" className="nav-item">
                        <Banknote size={20} />
                        <span>Credit Ledger</span>
                    </NavLink>
                    <NavLink to="/credit" className="nav-item">
                        <Users size={20} />
                        <span>Customers</span>
                    </NavLink>
                    <NavLink to="/reports" className="nav-item">
                        <CalendarRange size={20} />
                        <span>Reports</span>
                    </NavLink>
                    <div className="nav-divider"></div>
                    <NavLink to="/settings" className="nav-item">
                        <Settings size={20} />
                        <span>Settings</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-bar">
                    <div className="breadcrumbs">Dashboard / Overview</div>

                    {/* Profile Section */}
                    <div style={{ position: 'relative' }}>
                        <div
                            className="user-profile"
                            onClick={() => setShowProfileCard(!showProfileCard)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
                            <div className="user-info">
                                <p className="name">{user?.name || 'Guest'}</p>
                                <p className="role">{user?.role || 'Viewer'}</p>
                            </div>
                            <ChevronDown size={16} color="#64748b" style={{ marginLeft: '8px' }} />
                        </div>

                        {/* Profile Popover Card */}
                        {showProfileCard && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '10px',
                                background: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                border: '1px solid #e2e8f0',
                                width: '250px',
                                padding: '1.5rem',
                                zIndex: 50
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '64px', height: '64px',
                                        borderRadius: '50%',
                                        background: '#e0f2fe',
                                        color: '#0056b3',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '24px', fontWeight: 'bold',
                                        marginBottom: '0.5rem'
                                    }}>
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user?.name}</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{user?.role} Access</span>
                                </div>

                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        <strong>Shift:</strong> Morning (Active)
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        <strong>Location:</strong> Main Bunk
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        marginTop: '1.5rem',
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        background: '#fef2f2',
                                        color: '#ef4444',
                                        border: '1px solid #fee2e2',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="content-area">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
