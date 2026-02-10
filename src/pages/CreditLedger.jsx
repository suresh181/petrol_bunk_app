import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckCircle, Clock, Search, Filter, MessageCircle } from 'lucide-react';

const CreditLedger = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unsettled'); // 'all', 'settled', 'unsettled'
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);

        // 1. Fetch Transactions
        const { data: transactionsData, error: transError } = await supabase
            .from('credit_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (transError) {
            console.error("Error fetching credits:", transError);
            setLoading(false);
            return;
        }

        // 2. Fetch Customers to map names/phones (Manual Join)
        const { data: customersData, error: custError } = await supabase
            .from('customers')
            .select('id, name, phone');

        if (custError) console.error("Error fetching customers:", custError);

        const customerMap = {};
        if (customersData) {
            customersData.forEach(c => {
                customerMap[c.id] = c;
            });
        }

        if (transactionsData) {
            const formatted = transactionsData.map(t => {
                const customer = customerMap[t.customer_id];
                return {
                    ...t,
                    // Use live customer data if available, else fallback to stored snapshot
                    customer_name: customer?.name || t.customer_name || 'Unknown',
                    customer_phone: customer?.phone
                };
            });
            setTransactions(formatted);
        }
        setLoading(false);
    };

    const handleSettle = async (id) => {
        if (!confirm("Mark this transaction as SETTLED (Paid)?")) return;

        const { error } = await supabase
            .from('credit_transactions')
            .update({
                is_settled: true,
                settled_date: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            alert("Error updating: " + error.message);
        } else {
            // Optimistic update
            setTransactions(transactions.map(t =>
                t.id === id ? { ...t, is_settled: true, settled_date: new Date().toISOString() } : t
            ));
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.customer_name?.toLowerCase().includes(search.toLowerCase());
        if (filter === 'all') return matchesSearch;
        if (filter === 'settled') return matchesSearch && t.is_settled;
        if (filter === 'unsettled') return matchesSearch && !t.is_settled;
        return matchesSearch;
    });

    const totalOutstanding = transactions
        .filter(t => !t.is_settled)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Credit Ledger</h1>
                <div className="card" style={{ padding: '1rem', background: '#ffffff', borderLeft: '4px solid #F37022' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Outstanding</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F37022' }}>
                        ₹ {totalOutstanding.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        className="input"
                        placeholder="Search Customer..."
                        style={{ paddingLeft: '36px' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className={`btn ${filter === 'unsettled' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('unsettled')}
                    >
                        Unsettled
                    </button>
                    <button
                        className={`btn ${filter === 'settled' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('settled')}
                    >
                        Settled
                    </button>
                    <button
                        className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="card">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Date</th>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Customer</th>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Amount</th>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Status</th>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No records found</td>
                                </tr>
                            ) : (
                                filteredTransactions.map(t => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                                            {new Date(t.created_at).toLocaleDateString()}
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{t.customer_name}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>₹ {t.amount}</td>
                                        <td style={{ padding: '12px' }}>
                                            {t.is_settled ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.85rem', fontWeight: '500' }}>
                                                    <CheckCircle size={14} /> Settled
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#F37022', fontSize: '0.85rem', fontWeight: '500' }}>
                                                    <Clock size={14} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {!t.is_settled && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleSettle(t.id, t.amount)}
                                                        style={{
                                                            background: '#ecfdf5',
                                                            color: '#059669',
                                                            border: '1px solid #d1fae5',
                                                            padding: '4px 12px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600',
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}
                                                    >
                                                        Settle
                                                    </button>
                                                    {t.customer_phone && (
                                                        <a
                                                            href={`https://wa.me/${t.customer_phone}?text=Hello ${t.customer_name}, REMINDER from PPR & Sons: You have a pending credit bill of ₹${t.amount}. Please pay at your earliest convenience.`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                                background: '#25D366',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center',
                                                                textDecoration: 'none'
                                                            }}
                                                            title="Send WhatsApp Reminder"
                                                        >
                                                            <MessageCircle size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CreditLedger;
