import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabase';

const FuelManagement = () => {
    const { prices, nozzles, loading } = useData();

    // Local state for edits
    const [localPrices, setLocalPrices] = useState(prices);

    // Update local prices when context prices change (sync from cloud)
    useEffect(() => {
        if (prices) setLocalPrices(prices);
    }, [prices]);

    // Form State for New Nozzle
    const [showAddForm, setShowAddForm] = useState(false);
    const [newNozzle, setNewNozzle] = useState({ id: '', product: 'Petrol', flow: 0, tank: '', attendant: '' });

    // Update Prices (Cloud)
    const handleUpdatePrices = async () => {
        try {
            // Assuming we have a single price row, we update it. 
            // If 'prices.id' exists utilize it, else we might need a known ID or update all.
            // The DataContext fetch set 'id' in prices object.
            if (prices.id) {
                const { error } = await supabase
                    .from('fuel_prices')
                    .update({
                        petrol: localPrices.petrol,
                        diesel: localPrices.diesel,
                        power: localPrices.power,
                        petrol_profit: localPrices.petrol_profit,
                        diesel_profit: localPrices.diesel_profit,
                        petrol_stock: localPrices.petrol_stock,
                        diesel_stock: localPrices.diesel_stock
                    })
                    .eq('id', prices.id);

                if (error) throw error;
                alert('Prices updated in Cloud!');
            } else {
                // Fallback if no ID (shouldn't happen with correct seed)
                alert('Error: Price config not found in DB');
            }
        } catch (e) {
            alert('Update Failed: ' + e.message);
        }
    };

    // Add Nozzle (Cloud)
    const handleAddNozzle = async () => {
        if (newNozzle.id && newNozzle.tank) {
            try {
                // 1. Try to insert WITH attendant name
                const { error } = await supabase
                    .from('nozzles')
                    .insert([{
                        id: newNozzle.id,
                        product: newNozzle.product,
                        reading: Number(newNozzle.flow),
                        tank: newNozzle.tank,
                        attendant_name: newNozzle.attendant || 'Staff'
                    }]);

                if (error) throw error;

                setNewNozzle({ id: '', product: 'Petrol', flow: 0, tank: '', attendant: '' });
                setShowAddForm(false);
            } catch (e) {
                // 2. Fallback: If DB column missing, insert WITHOUT attendant name
                if (e.message?.includes('attendant_name')) {
                    console.warn("Column missing, retrying without attendant...");
                    try {
                        const { error: retryError } = await supabase
                            .from('nozzles')
                            .insert([{
                                id: newNozzle.id,
                                product: newNozzle.product,
                                reading: Number(newNozzle.flow),
                                tank: newNozzle.tank
                            }]);

                        if (retryError) throw retryError;

                        alert("Nozzle Added! (Note: 'Assigned Staff' was not saved because the Database needs the SQL update.)");
                        setNewNozzle({ id: '', product: 'Petrol', flow: 0, tank: '', attendant: '' });
                        setShowAddForm(false);
                    } catch (finalError) {
                        alert("Error adding nozzle: " + finalError.message);
                    }
                } else {
                    alert("Error adding nozzle: " + e.message);
                }
            }
        }
    };

    // Delete Nozzle (Cloud)
    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this nozzle?')) {
            const { error } = await supabase.from('nozzles').delete().eq('id', id);
            if (error) alert("Delete failed: " + error.message);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Syncing with Cloud...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Fuel & Nozzles</h1>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} /> Add Nozzle
                </button>
            </div>

            {/* Add Nozzle Modal/Form Area */}
            {showAddForm && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid #0056b3' }}>
                    <h3>Add New Nozzle</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'end', marginTop: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Nozzle ID</label>
                            <input className="input" placeholder="e.g. N5" value={newNozzle.id} onChange={e => setNewNozzle({ ...newNozzle, id: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Product</label>
                            <select className="input" value={newNozzle.product} onChange={e => setNewNozzle({ ...newNozzle, product: e.target.value })}>
                                <option>Petrol</option>
                                <option>Diesel</option>
                                <option>Power</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Initial Reading</label>
                            <input type="number" className="input" value={newNozzle.flow} onChange={e => setNewNozzle({ ...newNozzle, flow: e.target.value })} />
                        </div>
                        <div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Tank</label>
                                <input className="input" placeholder="e.g. T1" value={newNozzle.tank} onChange={e => setNewNozzle({ ...newNozzle, tank: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Assigned Staff</label>
                                <input className="input" placeholder="e.g. Raju" value={newNozzle.attendant} onChange={e => setNewNozzle({ ...newNozzle, attendant: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleAddNozzle}>Save Nozzle</button>
                        <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Price & Stock Configuration */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} /> Fuel Configuration
                </h3>

                {/* PRICES */}
                <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Daily Prices (₹)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label className="label">Petrol Price</label>
                        <input type="number" className="input" value={localPrices.petrol} onChange={(e) => setLocalPrices({ ...localPrices, petrol: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Diesel Price</label>
                        <input type="number" className="input" value={localPrices.diesel} onChange={(e) => setLocalPrices({ ...localPrices, diesel: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Power Price</label>
                        <input type="number" className="input" value={localPrices.power} onChange={(e) => setLocalPrices({ ...localPrices, power: e.target.value })} />
                    </div>
                </div>

                {/* PROFIT & STOCK */}
                <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Inventory & Profit Settings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div>
                        <label className="label">Petrol Profit (₹/L)</label>
                        <input type="number" className="input" value={localPrices.petrol_profit || 4.0} onChange={(e) => setLocalPrices({ ...localPrices, petrol_profit: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Diesel Profit (₹/L)</label>
                        <input type="number" className="input" value={localPrices.diesel_profit || 2.6} onChange={(e) => setLocalPrices({ ...localPrices, diesel_profit: e.target.value })} />
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                        <label className="label">Petrol Stock (L)</label>
                        <input type="number" className="input" value={localPrices.petrol_stock || 0} onChange={(e) => setLocalPrices({ ...localPrices, petrol_stock: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Diesel Stock (L)</label>
                        <input type="number" className="input" value={localPrices.diesel_stock || 0} onChange={(e) => setLocalPrices({ ...localPrices, diesel_stock: e.target.value })} />
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" style={{ width: '200px' }} onClick={handleUpdatePrices}>
                        <Save size={16} style={{ marginRight: '8px' }} /> Update Configuration
                    </button>
                </div>
            </div>

            {/* Nozzle List */}
            <div className="card">
                <h3>Active Nozzles (Synced)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>Nozzle ID</th>
                            <th style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>Product</th>
                            <th style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>Last Reading</th>
                            <th style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>Tank</th>
                            <th style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>Staff</th>
                            <th style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nozzles.map((nozzle) => (
                            <tr key={nozzle.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px', fontWeight: '500' }}>{nozzle.id}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        backgroundColor: nozzle.product === 'Petrol' ? '#e0f2fe' : '#fef3c7',
                                        color: nozzle.product === 'Petrol' ? '#0284c7' : '#d97706'
                                    }}>{nozzle.product}</span>
                                </td>
                                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{nozzle.flow}</td>
                                <td style={{ padding: '12px' }}>{nozzle.tank}</td>
                                <td style={{ padding: '12px' }}>{nozzle.attendant_name || 'Staff'}</td>
                                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleDelete(nozzle.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
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

export default FuelManagement;
