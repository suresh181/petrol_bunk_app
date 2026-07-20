import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Search, Bell, CheckCircle, XCircle } from 'lucide-react';

const ReminderLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Success', 'Failed'
    const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'SMS', 'WhatsApp'

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reminder_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (e) {
            console.error("Error fetching reminder logs:", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
                              log.phone?.includes(search);
        const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
        const matchesChannel = channelFilter === 'all' || log.channel === channelFilter;

        return matchesSearch && matchesStatus && matchesChannel;
    });

    const totalSent = logs.length;
    const totalSuccess = logs.filter(l => l.status === 'Success').length;
    const totalFailed = logs.filter(l => l.status === 'Failed').length;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Automated Reminder Logs</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="card" style={{ padding: '0.75rem 1.5rem', background: '#ffffff', borderLeft: '4px solid #3b82f6', minWidth: '120px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Sent</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>{totalSent}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem 1.5rem', background: '#ffffff', borderLeft: '4px solid #10b981', minWidth: '120px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Success</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{totalSuccess}</div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem 1.5rem', background: '#ffffff', borderLeft: '4px solid #ef4444', minWidth: '120px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Failed</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{totalFailed}</div>
                    </div>
                </div>
            </div>
            {/* Coming Soon Notice Banner */}
            <div className="card" style={{
                marginBottom: '1.5rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <div style={{
                    background: '#3b82f6',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap'
                }}>
                    Coming Soon
                </div>
                <div>
                    <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '0.95rem' }}>
                        Automatic Reminders — Coming Soon
                    </h4>
                    <p style={{ margin: 0, color: '#1d4ed8', fontSize: '0.85rem' }}>
                        Manual WhatsApp/Call buttons are active. Automated daily reminders will be enabled in a future update.
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        className="input"
                        placeholder="Search customer or phone..."
                        style={{ paddingLeft: '36px' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Channel Filter */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                        {['all', 'SMS', 'WhatsApp'].map(channel => (
                            <button
                                key={channel}
                                onClick={() => setChannelFilter(channel)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    background: channelFilter === channel ? '#ffffff' : 'transparent',
                                    color: channelFilter === channel ? '#1e293b' : '#64748b',
                                    boxShadow: channelFilter === channel ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {channel === 'all' ? 'All Channels' : channel}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                        {['all', 'Success', 'Failed'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    background: statusFilter === status ? '#ffffff' : 'transparent',
                                    color: statusFilter === status ? '#1e293b' : '#64748b',
                                    boxShadow: statusFilter === status ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {status === 'all' ? 'All Statuses' : status}
                            </button>
                        ))}
                    </div>

                    <button className="btn btn-secondary" onClick={fetchLogs} style={{ height: '36px' }}>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading logs...</div>
                ) : (
                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Timestamp</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Customer</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Phone</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Balance</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Channel</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Status</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No logs found</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                                                {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '12px', fontWeight: '500' }}>{log.customer_name}</td>
                                            <td style={{ padding: '12px', color: '#64748b' }}>{log.phone}</td>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>₹ {Number(log.amount).toFixed(2)}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    background: log.channel === 'WhatsApp' ? '#dcfce7' : '#e0f2fe',
                                                    color: log.channel === 'WhatsApp' ? '#15803d' : '#0369a1',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {log.channel}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {log.status === 'Success' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
                                                        <CheckCircle size={14} /> Success
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600' }}>
                                                        <XCircle size={14} /> Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', color: '#64748b', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.error_detail}>
                                                {log.error_detail || 'Sent successfully'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReminderLogs;
