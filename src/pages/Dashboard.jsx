import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabase';

const Dashboard = () => {
    const { prices, loading } = useData();
    const [outstandingCredit, setOutstandingCredit] = useState(0);

    useEffect(() => {
        const fetchCredit = async () => {
            const { data, error } = await supabase
                .from('credit_transactions')
                .select('amount', { count: 'exact' })
                .eq('is_settled', false);

            if (data) {
                const total = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                setOutstandingCredit(total);
            }
        };

        fetchCredit();

        // Optional: Subscribe to changes (simple poll or realtime can be added later)
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading Dashboard...</div>;

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>Overview</h1>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Today's Price</p>
                    <div style={{ margin: '0.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>Petrol:</span> <b>₹{prices.petrol}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>Diesel:</span> <b>₹{prices.diesel}</b>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #F37022' }}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Petrol Stock</p>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '700', margin: '0.5rem 0', color: '#F37022' }}>
                        {prices.petrol_stock ? prices.petrol_stock.toFixed(0) : 0} <span style={{ fontSize: '1rem' }}>L</span>
                    </h2>
                    <span style={{ color: (prices.petrol_stock < 1000 ? '#ef4444' : '#10b981'), fontSize: '0.8rem' }}>
                        {prices.petrol_stock < 1000 ? 'Low Stock Warning' : 'Stock Healthy'}
                    </span>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #002F87' }}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Diesel Stock</p>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '700', margin: '0.5rem 0', color: '#002F87' }}>
                        {prices.diesel_stock ? prices.diesel_stock.toFixed(0) : 0} <span style={{ fontSize: '1rem' }}>L</span>
                    </h2>
                    <span style={{ color: (prices.diesel_stock < 1000 ? '#ef4444' : '#10b981'), fontSize: '0.8rem' }}>
                        {prices.diesel_stock < 1000 ? 'Low Stock Warning' : 'Stock Healthy'}
                    </span>
                </div>
                {/* Credit Outstanding Card */}
                <div className="card" style={{ borderLeft: '4px solid #F37022' }}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Outstanding Credit</p>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '700', margin: '0.5rem 0', color: '#F37022' }}>
                        ₹ {outstandingCredit.toFixed(0)}
                    </h2>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Unsettled Bills</span>
                </div>
            </div>

            <div className="card">
                <h3>Live Nozzle Status</h3>
                <p style={{ color: '#64748b' }}>Connect backend service to view real-time nozzle activity.</p>
            </div>
        </div>
    );
};

export default Dashboard;
