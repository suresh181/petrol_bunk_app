import React, { useState, useEffect, Fragment } from 'react';
import { supabase } from '../services/supabase';
import { CheckCircle, Clock, Search, MessageCircle, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';

const CreditLedger = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unsettled'); // 'all', 'settled', 'unsettled'
    const [search, setSearch] = useState('');
    const [expandedCustomerId, setExpandedCustomerId] = useState(null);

    // Modal state for adding a payment
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
    const [paymentNotes, setPaymentNotes] = useState('');
    const [submittingPayment, setSubmittingPayment] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);

        // 1. Fetch all transactions chronologically (ascending) to compute running balances correctly
        const { data: transactionsData, error: transError } = await supabase
            .from('credit_transactions')
            .select('*')
            .order('created_at', { ascending: true });

        if (transError) {
            console.error("Error fetching credits:", transError);
            setLoading(false);
            return;
        }

        // 2. Fetch all customers
        const { data: customersData, error: custError } = await supabase
            .from('customers')
            .select('id, name, phone, vehicle');

        if (custError) {
            console.error("Error fetching customers:", custError);
        }

        // Map customers by ID
        const customerMap = {};
        if (customersData) {
            customersData.forEach(c => {
                customerMap[c.id] = {
                    ...c,
                    history: [],
                    balance: 0,
                    last_activity: '-'
                };
            });
        }

        // Process transactions chronologically to calculate running balances
        if (transactionsData) {
            transactionsData.forEach(t => {
                let customer = customerMap[t.customer_id];
                if (!customer) {
                    // Fallback to preserve legacy/orphaned transactions
                    customerMap[t.customer_id] = {
                        id: t.customer_id,
                        name: t.customer_name || 'Unknown',
                        phone: '',
                        vehicle: '',
                        history: [],
                        balance: 0,
                        last_activity: '-'
                    };
                    customer = customerMap[t.customer_id];
                }

                const amount = Number(t.amount) || 0;
                const type = t.type || 'Petrol Given';

                if (type === 'Payment Received') {
                    customer.balance -= amount;
                    customer.history.push({
                        ...t,
                        type: 'Payment Received',
                        entry_balance: customer.balance
                    });
                } else {
                    customer.balance += amount;
                    customer.history.push({
                        ...t,
                        type: 'Petrol Given',
                        entry_balance: customer.balance
                    });

                    // Auto-migrate legacy settled records in code:
                    // If a Petrol Given record was marked as fully settled, synthesize its matching payment
                    if (t.is_settled && !t.type) {
                        customer.balance -= amount;
                        customer.history.push({
                            id: t.id + '-payment-migrated',
                            created_at: t.settled_date || t.created_at,
                            customer_id: t.customer_id,
                            customer_name: t.customer_name,
                            amount: amount,
                            type: 'Payment Received',
                            is_settled: true,
                            notes: t.notes ? `Payment for: ${t.notes}` : 'Settlement Payment (Auto)',
                            entry_balance: customer.balance
                        });
                    }
                }

                // Format the activity date of the last transaction
                customer.last_activity = new Date(t.created_at).toLocaleDateString() + ' ' + 
                    new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            });
        }

        // Convert the map to an array and sort
        const customerList = Object.values(customerMap).map(c => {
            const status = c.balance === 0 ? 'Settled' : 'Pending';
            return {
                ...c,
                status
            };
        });

        // Sorting: Pending balances first, then alphabetically by name
        customerList.sort((a, b) => {
            if (a.balance > 0 && b.balance === 0) return -1;
            if (a.balance === 0 && b.balance > 0) return 1;
            return a.name.localeCompare(b.name);
        });

        setTransactions(customerList);
        setLoading(false);
    };

    const handleOpenPaymentModal = (customer) => {
        setSelectedCustomer(customer);
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().substring(0, 10));
        setPaymentNotes('');
        setShowPaymentModal(true);
    };

    const handleAddPaymentSubmit = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        setSubmittingPayment(true);
        try {
            const { error } = await supabase
                .from('credit_transactions')
                .insert([{
                    customer_id: selectedCustomer.id,
                    customer_name: selectedCustomer.name,
                    amount: Number(paymentAmount),
                    type: 'Payment Received',
                    is_settled: false,
                    created_at: new Date(paymentDate).toISOString(),
                    notes: paymentNotes || 'Manual Ledger Payment'
                }]);

            if (error) throw error;

            alert("Payment successfully logged!");
            setShowPaymentModal(false);
            fetchTransactions();
        } catch (e) {
            console.error("Error adding payment:", e);
            alert("Failed to record payment: " + e.message);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const toggleExpand = (customerId) => {
        if (expandedCustomerId === customerId) {
            setExpandedCustomerId(null);
        } else {
            setExpandedCustomerId(customerId);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase());
        if (filter === 'all') return matchesSearch;
        if (filter === 'settled') return matchesSearch && t.status === 'Settled';
        if (filter === 'unsettled') return matchesSearch && t.status === 'Pending';
        return matchesSearch;
    });

    const totalOutstanding = transactions.reduce((sum, c) => sum + (c.balance || 0), 0);

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
                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Last Activity</th>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Customer</th>
                                <th style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>Outstanding Balance</th>
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
                                    <Fragment key={t.id}>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                                                {t.last_activity}
                                            </td>
                                            <td 
                                                style={{ padding: '12px', fontWeight: '500', cursor: 'pointer' }}
                                                onClick={() => toggleExpand(t.id)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {expandedCustomerId === t.id ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                                                    <div>
                                                        <div>{t.name}</div>
                                                        {t.vehicle && <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal' }}>{t.vehicle}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>₹ {t.balance.toFixed(2)}</td>
                                            <td style={{ padding: '12px' }}>
                                                {t.status === 'Settled' ? (
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
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {t.balance > 0 && (
                                                        <button
                                                            onClick={() => handleOpenPaymentModal(t)}
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
                                                    )}
                                                    {t.phone && t.balance > 0 && (() => {
                                                        const reminderMsg = `Hello ${t.name}, Reminder from PPR and Sons (Indian Oil): Pending balance of Rs. ${t.balance.toFixed(2)} is to be paid for Vehicle ${t.vehicle || 'registered vehicle'}. Please settle at your earliest convenience.`;
                                                        const encodedMsg = encodeURIComponent(reminderMsg);
                                                        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
                                                        const smsHref = `sms:${t.phone}${isIOS ? '&' : '?'}body=${encodedMsg}`;
                                                        return (
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <a
                                                                    href={`https://wa.me/${t.phone}?text=${encodedMsg}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{
                                                                        background: '#25D366',
                                                                        color: '#ffffff',
                                                                        border: 'none',
                                                                        padding: '6px 8px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        display: 'flex', alignItems: 'center',
                                                                        textDecoration: 'none'
                                                                    }}
                                                                    title="Send WhatsApp Reminder"
                                                                >
                                                                    <MessageCircle size={14} />
                                                                </a>
                                                                <a
                                                                    href={smsHref}
                                                                    style={{
                                                                        background: '#0ea5e9',
                                                                        color: '#ffffff',
                                                                        border: 'none',
                                                                        padding: '6px 8px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        display: 'flex', alignItems: 'center',
                                                                        textDecoration: 'none'
                                                                    }}
                                                                    title="Send SMS Reminder"
                                                                >
                                                                    <Smartphone size={14} />
                                                                </a>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCustomerId === t.id && (
                                            <tr style={{ background: '#f8fafc' }}>
                                                <td colSpan="5" style={{ padding: '1rem 2rem' }}>
                                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                                                        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>Transaction & Payment History</h4>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                                                                    <th style={{ padding: '8px 12px' }}>Date</th>
                                                                    <th style={{ padding: '8px 12px' }}>Entry Type</th>
                                                                    <th style={{ padding: '8px 12px' }}>Amount</th>
                                                                    <th style={{ padding: '8px 12px' }}>Running Balance</th>
                                                                    <th style={{ padding: '8px 12px' }}>Notes</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {t.history.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No history entries found</td>
                                                                    </tr>
                                                                ) : (
                                                                    t.history.map((entry, idx) => (
                                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                            <td style={{ padding: '8px 12px' }}>{new Date(entry.created_at).toLocaleDateString()}</td>
                                                                            <td style={{ padding: '8px 12px' }}>
                                                                                <span style={{
                                                                                    color: entry.type === 'Payment Received' ? '#10b981' : '#F37022',
                                                                                    fontWeight: '600'
                                                                                }}>
                                                                                    {entry.type}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ padding: '8px 12px', fontWeight: '500' }}>₹ {entry.amount.toFixed(2)}</td>
                                                                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>₹ {entry.entry_balance.toFixed(2)}</td>
                                                                            <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '0.8rem' }}>{entry.notes || '-'}</td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedCustomer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface)' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Add Payment for {selectedCustomer.name}</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Current Pending Balance: <b>₹{selectedCustomer.balance.toFixed(2)}</b>
                        </p>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Amount Paid (₹)</label>
                            <input 
                                type="number" 
                                className="input" 
                                value={paymentAmount} 
                                onChange={e => setPaymentAmount(e.target.value)} 
                                placeholder="Enter amount" 
                                autoFocus 
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Payment Date</label>
                            <input 
                                type="date" 
                                className="input" 
                                value={paymentDate} 
                                onChange={e => setPaymentDate(e.target.value)} 
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Notes</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={paymentNotes} 
                                onChange={e => setPaymentNotes(e.target.value)} 
                                placeholder="e.g. Cash, PhonePe, GPay" 
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 1 }} 
                                onClick={handleAddPaymentSubmit}
                                disabled={submittingPayment}
                            >
                                {submittingPayment ? 'Saving...' : 'Submit'}
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                style={{ flex: 1, border: '1px solid var(--border)' }} 
                                onClick={() => setShowPaymentModal(false)}
                                disabled={submittingPayment}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditLedger;
