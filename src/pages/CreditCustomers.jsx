import React, { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabase';

const CreditCustomers = () => {
    const { customers, loading } = useData();

    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', vehicle: '', discount: 0 });
    const [showForm, setShowForm] = useState(false);

    // Deletion modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [pendingBalance, setPendingBalance] = useState(0);
    const [checkingBalance, setCheckingBalance] = useState(false);

    const handleAdd = async () => {
        if (newCustomer.name) {
            try {
                const { error } = await supabase.from('customers').insert([{
                    name: newCustomer.name,
                    phone: newCustomer.phone,
                    vehicle: newCustomer.vehicle,
                    discount_percent: newCustomer.discount
                }]);

                if (error) throw error;

                setNewCustomer({ name: '', phone: '', vehicle: '', discount: 0 });
                setShowForm(false);
            } catch (e) {
                alert("Error adding customer: " + e.message);
            }
        }
    };

    const handleDeleteClick = async (customer) => {
        setCheckingBalance(true);
        try {
            // 1. Fetch live transactions to calculate outstanding balance
            const { data: transData, error: transError } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('customer_id', customer.id);

            if (transError) throw transError;

            let balance = 0;
            if (transData) {
                transData.forEach(t => {
                    const amount = Number(t.amount) || 0;
                    const type = t.type || 'Petrol Given';
                    if (type === 'Payment Received') {
                        balance -= amount;
                    } else {
                        balance += amount;
                        if (t.is_settled && !t.type) {
                            balance -= amount; // Legacy settled transaction has 0 net effect
                        }
                    }
                });
            }

            if (balance <= 0) {
                // Settle and delete immediately if no balance remains
                if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
                    await performDelete(customer, 0);
                }
            } else {
                // Show confirmation popup modal for pending balance
                setCustomerToDelete(customer);
                setPendingBalance(balance);
                setShowDeleteModal(true);
            }
        } catch (e) {
            console.error("Error checking balance:", e);
            alert("Error checking customer balance: " + e.message);
        } finally {
            setCheckingBalance(false);
        }
    };

    const performDelete = async (customer, balanceToSettle) => {
        try {
            // 1. If balance > 0, log a settled payment in credit_transactions with null customer_id (system wide ledger reference)
            if (balanceToSettle > 0) {
                const { error: insertError } = await supabase
                    .from('credit_transactions')
                    .insert([{
                        customer_id: null,
                        customer_name: customer.name,
                        amount: balanceToSettle,
                        type: 'Payment Received',
                        is_settled: true,
                        created_at: new Date().toISOString(),
                        notes: `Auto-settlement due to customer deletion of: ${customer.name} (Pending: ₹${balanceToSettle.toFixed(2)})`
                    }]);

                if (insertError) throw insertError;
            }

            // 2. Delete all ledger/transaction entries tied to this customer ID
            const { error: transDelError } = await supabase
                .from('credit_transactions')
                .delete()
                .eq('customer_id', customer.id);

            if (transDelError) throw transDelError;

            // 3. Delete the customer record from the Customer tab
            const { error: custDelError } = await supabase
                .from('customers')
                .delete()
                .eq('id', customer.id);

            if (custDelError) throw custDelError;

            alert(`Customer ${customer.name} and their history cleared successfully.`);
            setShowDeleteModal(false);
            
            // Reload page to force Context and components to query new datasets
            window.location.reload();
        } catch (e) {
            console.error("Deletion failed:", e);
            alert("Deletion failed: " + e.message);
        }
    };

    if (loading || checkingBalance) {
        return <div style={{ padding: '20px' }}>{checkingBalance ? 'Checking customer ledger balance...' : 'Syncing Customers...'}</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Credit Customers</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} /> Add Customer
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid #0056b3' }}>
                    <h3>Add New Credit Customer</h3>
                    <div className="add-customer-grid" style={{ marginTop: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Customer / Company Name</label>
                            <input className="input" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="e.g. Siva Transports" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Phone Number</label>
                            <input className="input" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="e.g. 9876543210" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Vehicle / Note</label>
                            <input className="input" value={newCustomer.vehicle} onChange={e => setNewCustomer({ ...newCustomer, vehicle: e.target.value })} placeholder="e.g. TN-99-XX-9999" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Discount (%)</label>
                            <input type="number" step="0.1" className="input" value={newCustomer.discount} onChange={e => setNewCustomer({ ...newCustomer, discount: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <button className="btn btn-primary" onClick={handleAdd}>Save</button>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px', color: '#64748b' }}>Name</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Phone</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Vehicle / Fleet</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Discount</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px', fontWeight: '500' }}>{c.name}</td>
                                <td style={{ padding: '12px', color: '#64748b' }}>{c.phone || '-'}</td>
                                <td style={{ padding: '12px' }}>{c.vehicle}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ background: '#ecfccb', color: '#4d7c0f', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                                        {c.discount}% Off
                                    </span>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <button onClick={() => handleDeleteClick(c)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Settle & Delete Customer Modal */}
            {showDeleteModal && customerToDelete && (
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
                    <div className="card" style={{ width: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--surface)', border: '1px solid #dc2626' }}>
                        <h3 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Settle & Delete Customer?
                        </h3>
                        
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                            <p style={{ margin: '0 0 10px 0' }}>
                                <b>{customerToDelete.name}</b> still has a pending balance of <span style={{ color: '#F37022', fontWeight: 'bold' }}>₹ {pendingBalance.toFixed(2)}</span>.
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Deleting this customer will settle this balance and clear all their transaction history. This action cannot be undone.
                            </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button 
                                className="btn" 
                                style={{ 
                                    flex: 1, 
                                    backgroundColor: '#fee2e2', 
                                    color: '#dc2626', 
                                    border: '1px solid #fca5a5',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }} 
                                onClick={() => performDelete(customerToDelete, pendingBalance)}
                            >
                                Yes, settle and delete
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                style={{ flex: 1, border: '1px solid var(--border)', cursor: 'pointer' }} 
                                onClick={() => { setShowDeleteModal(false); setCustomerToDelete(null); }}
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

export default CreditCustomers;
