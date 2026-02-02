import React, { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabase';

const CreditCustomers = () => {
    const { customers, loading } = useData();

    const [newCustomer, setNewCustomer] = useState({ name: '', vehicle: '', discount: 0 });
    const [showForm, setShowForm] = useState(false);

    const handleAdd = async () => {
        if (newCustomer.name) {
            try {
                const { error } = await supabase.from('customers').insert([{
                    name: newCustomer.name,
                    vehicle: newCustomer.vehicle,
                    discount_percent: newCustomer.discount
                }]);

                if (error) throw error;

                setNewCustomer({ name: '', vehicle: '', discount: 0 });
                setShowForm(false);
            } catch (e) {
                alert("Error adding customer: " + e.message);
            }
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Delete this customer?")) {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) alert("Error deleting: " + error.message);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Syncing Customers...</div>;

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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 100px', gap: '1rem', alignItems: 'end', marginTop: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Customer / Company Name</label>
                            <input className="input" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="e.g. Siva Transports" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Vehicle / Note</label>
                            <input className="input" value={newCustomer.vehicle} onChange={e => setNewCustomer({ ...newCustomer, vehicle: e.target.value })} placeholder="e.g. TN-99-XX-9999" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Discount (%)</label>
                            <input type="number" step="0.1" className="input" value={newCustomer.discount} onChange={e => setNewCustomer({ ...newCustomer, discount: parseFloat(e.target.value) })} />
                        </div>
                        <button className="btn btn-primary" onClick={handleAdd}>Save</button>
                    </div>
                </div>
            )}

            <div className="card">
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
                                    <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CreditCustomers;
