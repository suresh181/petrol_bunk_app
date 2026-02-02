import React, { useEffect, useState } from 'react';
import { BarChart, PieChart, TrendingUp, Droplets, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useData } from '../context/DataContext';

const Reports = () => {
    const { prices } = useData(); // Live prices & stock
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch History
    useEffect(() => {
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('sales_records')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) setHistory(data);
            setLoading(false);
        };
        fetchHistory();
    }, []);

    // --- AGGREGATIONS ---

    // 1. Monthly Trend (Simple: Last 30 records aggregation)
    const salesTrend = history.slice(0, 30).map(h => ({
        date: new Date(h.shift_date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
        petrol: Number(h.petrol_sold),
        diesel: Number(h.diesel_sold)
    })).reverse();

    // 2. Attendant Performance
    const attendantStats = {};
    history.forEach(h => {
        if (!h.staff_on_duty) return;
        const staffNames = h.staff_on_duty.split(',').map(s => s.trim());
        staffNames.forEach(name => {
            if (!attendantStats[name]) attendantStats[name] = { petrol: 0, diesel: 0, shifts: 0 };
            attendantStats[name].petrol += Number(h.petrol_sold) / staffNames.length; // Approximate split
            attendantStats[name].diesel += Number(h.diesel_sold) / staffNames.length;
            attendantStats[name].shifts += 1;
        });
    });

    if (loading) return <div style={{ padding: '2rem' }}>Loading Reports...</div>;

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Business Reports</h1>

            {/* TOP ROW: STOCK & PROFITS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                {/* Stock Reconciliation */}
                <div className="card" style={{ borderLeft: '4px solid #F37022' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F37022' }}>
                        <Droplets size={20} /> Stock Reconciliation
                    </h3>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Petrol Stock</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{prices?.petrol_stock?.toFixed(0) || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>L</span></div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Diesel Stock</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{prices?.diesel_stock?.toFixed(0) || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>L</span></div>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        *Auto-deducted on shift close
                    </div>
                </div>

                {/* Total Profit Overview (All Time in History) */}
                <div className="card" style={{ borderLeft: '4px solid #002F87' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#002F87' }}>
                        <TrendingUp size={20} /> Total Net Profit
                    </h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
                            ₹ {history.reduce((acc, curr) => acc + Number(curr.net_profit || 0), 0).toFixed(0)}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Recorded from {history.length} Assignments</div>
                    </div>
                </div>
            </div>

            {/* MONTHLY TRENDS (Visual) */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3><BarChart size={18} style={{ marginRight: '8px' }} /> Sales Trend (Last 30 Shifts)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '10px', marginTop: '1rem', paddingBottom: '1rem', overflowX: 'auto' }}>
                    {salesTrend.map((d, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', width: '100%', gap: '4px' }}>
                                {/* Petrol Bar */}
                                <div style={{
                                    width: '50%',
                                    background: 'rgba(243, 112, 34, 0.6)',
                                    height: `${Math.min((d.petrol / 5000) * 100, 100)}%`, // Scale: 5000L max
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.3s'
                                }} title={`Petrol: ${d.petrol}L`} />
                                {/* Diesel Bar */}
                                <div style={{
                                    width: '50%',
                                    background: 'rgba(0, 47, 135, 0.6)',
                                    height: `${Math.min((d.diesel / 5000) * 100, 100)}%`,
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.3s'
                                }} title={`Diesel: ${d.diesel}L`} />
                            </div>
                            <div style={{ fontSize: '0.7rem', marginTop: '6px', color: '#94a3b8', transform: 'rotate(-45deg)' }}>{d.date}</div>
                        </div>
                    ))}
                    {salesTrend.length === 0 && <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>No Data Yet</div>}
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: '#F37022' }}></div> Petrol</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: '#002F87' }}></div> Diesel</div>
                </div>
            </div>

            {/* ATTENDANT PERFORMANCE */}
            <div className="card">
                <h3><Users size={18} style={{ marginRight: '8px' }} /> Staff Performance</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                            <th style={{ padding: '10px', fontSize: '0.85rem', color: '#64748b' }}>Staff Name</th>
                            <th style={{ padding: '10px', fontSize: '0.85rem', color: '#64748b' }}>Shifts</th>
                            <th style={{ padding: '10px', fontSize: '0.85rem', color: '#64748b' }}>Total Petrol (L)</th>
                            <th style={{ padding: '10px', fontSize: '0.85rem', color: '#64748b' }}>Total Diesel (L)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(attendantStats).map(name => (
                            <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px', fontWeight: '500' }}>{name}</td>
                                <td style={{ padding: '10px' }}>{attendantStats[name].shifts}</td>
                                <td style={{ padding: '10px', color: '#F37022' }}>{attendantStats[name].petrol.toFixed(0)}</td>
                                <td style={{ padding: '10px', color: '#002F87' }}>{attendantStats[name].diesel.toFixed(0)}</td>
                            </tr>
                        ))}
                        {Object.keys(attendantStats).length === 0 && (
                            <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No shift data recorded yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default Reports;
