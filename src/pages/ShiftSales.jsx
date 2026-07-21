import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Plus, Trash2, TrendingUp, User, ShieldCheck, CheckCircle } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

// Helper Input Component
const InputRow = ({ label, val, setVal, readOnly = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{label}</span>
        <input
            type="number"
            className="input"
            style={{ width: '120px', textAlign: 'right', background: readOnly ? '#f1f5f9' : '#fff' }}
            value={val}
            readOnly={readOnly}
            onChange={e => !readOnly && setVal(e.target.value)}
        />
    </div>
);

const DEFAULT_PUMPS = [
    { id: 'P577', name: 'Pump 577' },
    { id: 'P570', name: 'Pump 570' }
];

const DEFAULT_PUMP_ENTRY = () => ({
    petrol1: { opening: 0, closing: 0, test: 0, cash: 0, upi: 0, card: 0, credit: 0 },
    petrol2: { opening: 0, closing: 0, test: 0, cash: 0, upi: 0, card: 0, credit: 0 },
    diesel1: { opening: 0, closing: 0, test: 0, cash: 0, upi: 0, card: 0, credit: 0 },
    diesel2: { opening: 0, closing: 0, test: 0, cash: 0, upi: 0, card: 0, credit: 0 }
});

const ShiftSales = () => {
    const contextData = useData();
    const { prices = {}, customers = [], loading } = contextData || {};
    const { user } = useAuth();

    // Data Persistence Helper
    const loadState = (key, defaultVal) => {
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing saved state", e);
                return defaultVal;
            }
        }
        return defaultVal;
    };

    // Pumps Master List State
    const [pumpsList, setPumpsList] = useState(() => loadState('pumps_list', DEFAULT_PUMPS));
    const [showAddPumpModal, setShowAddPumpModal] = useState(false);
    const [newPumpName, setNewPumpName] = useState('');

    // Fetch Pumps from DB if available
    useEffect(() => {
        const fetchPumps = async () => {
            try {
                const { data, error } = await supabase.from('pumps').select('*').eq('active', true).order('created_at', { ascending: true });
                if (!error && data && data.length > 0) {
                    setPumpsList(data.map(p => ({ id: p.id, name: p.name })));
                }
            } catch (e) {
                console.warn("Using local pumps fallback:", e);
            }
        };
        fetchPumps();
    }, []);

    // Persist pumps list locally
    useEffect(() => {
        localStorage.setItem('pumps_list', JSON.stringify(pumpsList));
    }, [pumpsList]);

    // Pump Sales State (mapped by pump ID)
    const [pumpSales, setPumpSales] = useState(() => {
        const saved = loadState('pump_sales_data', null);
        if (saved) return saved;
        const initial = {};
        DEFAULT_PUMPS.forEach(p => {
            initial[p.id] = DEFAULT_PUMP_ENTRY();
        });
        return initial;
    });

    // Ensure all pumps in pumpsList have an entry state
    useEffect(() => {
        setPumpSales(prev => {
            const updated = { ...prev };
            let changed = false;
            pumpsList.forEach(p => {
                if (!updated[p.id]) {
                    updated[p.id] = DEFAULT_PUMP_ENTRY();
                    changed = true;
                }
            });
            if (changed) localStorage.setItem('pump_sales_data', JSON.stringify(updated));
            return updated;
        });
    }, [pumpsList]);

    // Auto-save pump sales data
    useEffect(() => {
        localStorage.setItem('pump_sales_data', JSON.stringify(pumpSales));
    }, [pumpSales]);

    // Section 4: Daily Settlement Logic State (Manual UPI)
    const [manualUpiSettlement, setManualUpiSettlement] = useState(() => loadState('manual_upi_settlement', ''));
    const [todayPendingInput, setTodayPendingInput] = useState(() => loadState('today_pending_input', ''));
    const [yesterdayPending, setYesterdayPending] = useState(0);

    useEffect(() => {
        localStorage.setItem('manual_upi_settlement', String(manualUpiSettlement));
    }, [manualUpiSettlement]);

    useEffect(() => {
        localStorage.setItem('today_pending_input', String(todayPendingInput));
    }, [todayPendingInput]);

    // Fetch Yesterday's Pending from DB
    useEffect(() => {
        const fetchPending = async () => {
            const { data } = await supabase.from('sales_records').select('shortage_excess').order('created_at', { ascending: false }).limit(1);
            if (data && data.length > 0) setYesterdayPending(data[0].shortage_excess || 0);
        };
        fetchPending();
    }, []);

    // Helper to update a field inside a specific pump & slot
    const updateEntry = (pumpId, slot, field, value) => {
        setPumpSales(prev => ({
            ...prev,
            [pumpId]: {
                ...prev[pumpId],
                [slot]: {
                    ...prev[pumpId]?.[slot],
                    [field]: Number(value)
                }
            }
        }));
    };

    // Calculate figures for an entry slot
    const getEntryMetrics = (entry, fuelType) => {
        const opening = Number(entry?.opening || 0);
        const closing = Number(entry?.closing || 0);
        const test = Number(entry?.test || 0);
        const litres = Math.max(0, closing - opening - test);
        const rate = fuelType === 'Petrol' ? Number(prices?.petrol || 0) : Number(prices?.diesel || 0);
        const saleAmount = litres * rate;

        const cash = Number(entry?.cash || 0);
        const upi = Number(entry?.upi || 0);
        const card = Number(entry?.card || 0);
        const credit = Number(entry?.credit || 0);
        const totalCollections = cash + upi + card + credit;
        const shortageExcess = saleAmount - totalCollections;

        return { litres, saleAmount, cash, upi, card, credit, totalCollections, shortageExcess };
    };

    // Aggregates across ALL pumps and slots
    let totalPetrolLitres = 0;
    let totalDieselLitres = 0;
    let totalPetrolSaleAmount = 0;
    let totalDieselSaleAmount = 0;
    let totalCashCollected = 0;
    let totalUpiCollected = 0;
    let totalCardCollected = 0;
    let totalCreditCollected = 0;

    pumpsList.forEach(p => {
        const pData = pumpSales[p.id] || DEFAULT_PUMP_ENTRY();

        ['petrol1', 'petrol2'].forEach(slot => {
            const m = getEntryMetrics(pData[slot], 'Petrol');
            totalPetrolLitres += m.litres;
            totalPetrolSaleAmount += m.saleAmount;
            totalCashCollected += m.cash;
            totalUpiCollected += m.upi;
            totalCardCollected += m.card;
            totalCreditCollected += m.credit;
        });

        ['diesel1', 'diesel2'].forEach(slot => {
            const m = getEntryMetrics(pData[slot], 'Diesel');
            totalDieselLitres += m.litres;
            totalDieselSaleAmount += m.saleAmount;
            totalCashCollected += m.cash;
            totalUpiCollected += m.upi;
            totalCardCollected += m.card;
            totalCreditCollected += m.credit;
        });
    });

    const totalSaleAmount = totalPetrolSaleAmount + totalDieselSaleAmount;
    const totalCollections = totalCashCollected + totalUpiCollected + totalCardCollected + totalCreditCollected;
    const overallShortageExcess = totalSaleAmount - totalCollections;

    // Reconciliation formula with Manual UPI
    const manualUpiVal = Number(manualUpiSettlement || 0);
    const todayPendingVal = Number(todayPendingInput || 0);

    // Difference = (Manual Bank UPI + Yesterday Pending) - (System Recorded Pump UPI + Today Pending)
    const settlement_difference = (manualUpiVal + Number(yesterdayPending || 0)) - (totalUpiCollected + todayPendingVal);

    // Credit Helper Bills State
    const [creditBills, setCreditBills] = useState(() => loadState('shift_credits', []));
    const [newBill, setNewBill] = useState({ customerId: '', billAmount: '', paidAmount: '', product: 'Petrol' });

    useEffect(() => localStorage.setItem('shift_credits', JSON.stringify(creditBills)), [creditBills]);

    const parseAmt = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
    const netCredit = parseAmt(newBill.billAmount) - parseAmt(newBill.paidAmount);

    const handleAddBill = async () => {
        try {
            if (!newBill.customerId) {
                alert("Please select a Customer first.");
                return;
            }
            if (!newBill.billAmount) {
                alert("Please enter the Total Bill Amount.");
                return;
            }

            const customer = customers.find(c => c.id == newBill.customerId);
            if (!customer) return;

            if (netCredit < 0) {
                alert("Paid amount cannot be more than Bill amount");
                return;
            }

            if (netCredit === 0) {
                if (!confirm("Net Credit is 0 (Fully Paid). Do you still want to log this?")) return;
            }

            const { data, error } = await supabase
                .from('credit_transactions')
                .insert([{
                    customer_id: customer.id,
                    customer_name: customer.name,
                    amount: netCredit,
                    created_at: new Date(),
                    is_settled: false,
                    notes: `Shift Sale: ${newBill.product}. Bill: ₹${newBill.billAmount}, Paid: ₹${newBill.paidAmount}`
                }])
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("No data returned from insert");

            setCreditBills([...creditBills, { ...data[0], customerName: customer.name, total: netCredit }]);
            setNewBill({ ...newBill, billAmount: '', paidAmount: '' });
            alert(`Bill Added! Credit: ₹${netCredit}. Please add this to your Pump Credit collection row.`);

        } catch (err) {
            console.error("Add Bill Error:", err);
            alert("Error adding bill: " + err.message);
        }
    };

    const handleDeleteBill = async (id) => {
        if (!confirm("Delete this bill?")) return;
        await supabase.from('credit_transactions').delete().eq('id', id);
        setCreditBills(creditBills.filter(b => b.id !== id));
    };

    const handleAddPump = async () => {
        if (!newPumpName.trim()) {
            alert("Please enter a valid Pump Name.");
            return;
        }

        const pumpId = 'P' + newPumpName.replace(/[^0-9a-zA-Z]/g, '');
        const newPumpObj = { id: pumpId, name: newPumpName.trim() };

        try {
            await supabase.from('pumps').insert([{ id: pumpId, name: newPumpName.trim(), active: true }]);
        } catch (e) {
            console.warn("Could not insert pump to DB, saving locally:", e);
        }

        setPumpsList(prev => [...prev.filter(p => p.id !== pumpId), newPumpObj]);
        setNewPumpName('');
        setShowAddPumpModal(false);
    };

    const handleReset = () => {
        if (confirm("This will clear saved daily sales entries and reload.")) {
            localStorage.removeItem('pump_sales_data');
            localStorage.removeItem('manual_upi_settlement');
            localStorage.removeItem('today_pending_input');
            localStorage.removeItem('shift_credits');
            window.location.reload();
        }
    };

    // Close Shift & Export Report
    const handleCloseShift = async () => {
        if (!confirm("Confirm Close Daily Reconciliation? This will save all pump data and download the report.")) return;

        const record = {
            shift_date: new Date(),
            shift_runner: user?.name || 'Unknown',
            petrol_sold: totalPetrolLitres,
            diesel_sold: totalDieselLitres,
            total_amount: totalSaleAmount,
            shortage_excess: todayPendingVal,
            today_settlement_amount: manualUpiVal,
            cash_collected: totalCashCollected,
            upi_collected: manualUpiVal,
            card_collected: totalCardCollected,
        };

        // Prepare Excel Report Rows
        const excelRows = [
            { "Metric": "DAILY RECONCILIATION REPORT (PUMP-BASED)", "Value": "---" },
            { "Metric": "Date", "Value": new Date().toLocaleDateString() },
            { "Metric": "Manager", "Value": user?.name || 'Staff' },
            { "Metric": "", "Value": "" }
        ];

        pumpsList.forEach(p => {
            const pData = pumpSales[p.id] || DEFAULT_PUMP_ENTRY();
            excelRows.push({ "Metric": `=== ${p.name.toUpperCase()} ===`, "Value": "---" });

            const slots = [
                { key: 'petrol1', label: 'Petrol 1', type: 'Petrol' },
                { key: 'petrol2', label: 'Petrol 2', type: 'Petrol' },
                { key: 'diesel1', label: 'Diesel 1', type: 'Diesel' },
                { key: 'diesel2', label: 'Diesel 2', type: 'Diesel' }
            ];

            slots.forEach(s => {
                const m = getEntryMetrics(pData[s.key], s.type);
                excelRows.push({ "Metric": `${s.label} Litres Sold`, "Value": m.litres.toFixed(2) });
                excelRows.push({ "Metric": `${s.label} Expected Amount (₹)`, "Value": m.saleAmount.toFixed(2) });
                excelRows.push({ "Metric": `${s.label} Collections`, "Value": `Cash: ${m.cash}, UPI: ${m.upi}, Card: ${m.card}, Credit: ${m.credit}` });
                excelRows.push({ "Metric": `${s.label} Shortage/Excess`, "Value": m.shortageExcess.toFixed(2) });
            });
            excelRows.push({ "Metric": "", "Value": "" });
        });

        // Add Settlement Section
        excelRows.push(
            { "Metric": "DAILY SETTLEMENT (MANUAL UPI)", "Value": "---" },
            { "Metric": "System Recorded Pump UPI Sum", "Value": totalUpiCollected.toFixed(2) },
            { "Metric": "Manual Bank UPI Settlement", "Value": manualUpiVal.toFixed(2) },
            { "Metric": "Yesterday Pending", "Value": Number(yesterdayPending).toFixed(2) },
            { "Metric": "Today Pending (Input)", "Value": todayPendingVal.toFixed(2) },
            { "Metric": "Reconciliation Difference", "Value": settlement_difference.toFixed(2) },
            { "Metric": "", "Value": "" },
            { "Metric": "OVERALL TOTALS", "Value": "---" },
            { "Metric": "Total Petrol Sold (L)", "Value": totalPetrolLitres.toFixed(2) },
            { "Metric": "Total Diesel Sold (L)", "Value": totalDieselLitres.toFixed(2) },
            { "Metric": "Total Sales Amount (₹)", "Value": totalSaleAmount.toFixed(2) }
        );

        // Save DB Record
        try {
            const { error } = await supabase.from('sales_records').insert([record]);
            if (error) console.error("Database save error:", error);
        } catch (e) {
            console.error("DB error:", e);
        }

        // Export Excel
        try {
            const wb = utils.book_new();
            const ws = utils.json_to_sheet(excelRows);
            ws['!cols'] = [{ wch: 35 }, { wch: 40 }];
            utils.book_append_sheet(wb, ws, "Daily Pump Reconciliation");
            writeFile(wb, `Pump_Reconciliation_${new Date().toISOString().slice(0, 10)}.xlsx`);

            alert("Saved Record & Downloaded Excel Report!");

            localStorage.removeItem('pump_sales_data');
            localStorage.removeItem('manual_upi_settlement');
            localStorage.removeItem('today_pending_input');
            localStorage.removeItem('shift_credits');

            window.location.reload();
        } catch (err) {
            alert("Error generating Excel: " + err.message);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Pump Sales...</div>;

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.2rem' }}>Daily Pump Sales & Reconciliation</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem' }}>
                        <ShieldCheck size={16} />
                        <span>Manager: <b>{user?.name || 'Staff'}</b></span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => setShowAddPumpModal(true)}>
                        <Plus size={16} style={{ marginRight: '6px' }} /> Add Pump
                    </button>
                    <button onClick={handleReset} style={{ fontSize: '0.8rem', color: '#ef4444', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Reset Entry Data
                    </button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="page-grid">
                {/* LEFT COLUMN: Pumps Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {pumpsList.map(pump => {
                        const pData = pumpSales[pump.id] || DEFAULT_PUMP_ENTRY();

                        const renderSlotCard = (slotKey, title, fuelType) => {
                            const entry = pData[slotKey] || {};
                            const metrics = getEntryMetrics(entry, fuelType);
                            const cardBorder = fuelType === 'Petrol' ? '#3b82f6' : '#f59e0b';
                            const badgeBg = fuelType === 'Petrol' ? '#eff6ff' : '#fffbeb';
                            const badgeColor = fuelType === 'Petrol' ? '#1d4ed8' : '#b45309';

                            return (
                                <div key={slotKey} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <h4 style={{ margin: 0, color: badgeColor, fontSize: '0.9rem' }}>{title} ({fuelType})</h4>
                                        <span style={{ background: badgeBg, color: badgeColor, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            Rate: ₹{fuelType === 'Petrol' ? prices?.petrol || 0 : prices?.diesel || 0}/L
                                        </span>
                                    </div>
                                    <div className="section-grid">
                                        <div>
                                            <h5 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Readings</h5>
                                            <InputRow label="Opening Reading" val={entry.opening} setVal={v => updateEntry(pump.id, slotKey, 'opening', v)} />
                                            <InputRow label="Closing Reading" val={entry.closing} setVal={v => updateEntry(pump.id, slotKey, 'closing', v)} />
                                            <InputRow label="Test Sample (L)" val={entry.test} setVal={v => updateEntry(pump.id, slotKey, 'test', v)} />

                                            <div style={{ marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'right', color: badgeColor, fontSize: '0.85rem' }}>
                                                Litres Sold: {metrics.litres.toFixed(2)} L
                                            </div>
                                            <div style={{ marginTop: '0.2rem', fontWeight: 'bold', textAlign: 'right', color: '#1e293b', fontSize: '0.9rem' }}>
                                                Expected Amt: ₹ {metrics.saleAmount.toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            <h5 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Collections</h5>
                                            <InputRow label="Cash" val={entry.cash} setVal={v => updateEntry(pump.id, slotKey, 'cash', v)} />
                                            <InputRow label="UPI" val={entry.upi} setVal={v => updateEntry(pump.id, slotKey, 'upi', v)} />
                                            <InputRow label="Card" val={entry.card} setVal={v => updateEntry(pump.id, slotKey, 'card', v)} />
                                            <InputRow label="Credit" val={entry.credit} setVal={v => updateEntry(pump.id, slotKey, 'credit', v)} />
                                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span>Diff (Shortage):</span>
                                                <span style={{ fontWeight: 'bold', color: metrics.shortageExcess > 0 ? '#ef4444' : '#10b981' }}>
                                                    ₹ {metrics.shortageExcess.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div key={pump.id} className="card" style={{ borderLeft: '5px solid #0284c7' }}>
                                <h3 style={{ color: '#0369a1', marginBottom: '1rem', fontSize: '1.2rem' }}>{pump.name}</h3>
                                {renderSlotCard('petrol1', 'Petrol Entry 1', 'Petrol')}
                                {renderSlotCard('petrol2', 'Petrol Entry 2', 'Petrol')}
                                {renderSlotCard('diesel1', 'Diesel Entry 1', 'Diesel')}
                                {renderSlotCard('diesel2', 'Diesel Entry 2', 'Diesel')}
                            </div>
                        );
                    })}

                    {/* Credit Helper Card */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Add Credit Bill Helper</h3>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Log Customer Credit Debt</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <select className="input" value={newBill.customerId} onChange={e => setNewBill({ ...newBill, customerId: e.target.value })} style={{ width: '180px' }}>
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input
                                type="text"
                                className="input"
                                style={{ width: '100px' }}
                                placeholder="Total Bill"
                                value={newBill.billAmount}
                                onChange={e => setNewBill({ ...newBill, billAmount: e.target.value })}
                            />
                            <input
                                type="text"
                                className="input"
                                style={{ width: '100px' }}
                                placeholder="Paid Now"
                                value={newBill.paidAmount}
                                onChange={e => setNewBill({ ...newBill, paidAmount: e.target.value })}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>
                                Credit: <span style={{ color: netCredit > 0 ? '#ef4444' : '#10b981', marginLeft: '5px' }}>₹{netCredit}</span>
                            </div>
                            <button className="btn btn-primary" onClick={handleAddBill}><Plus size={18} /></button>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                            {creditBills.length > 0 ? (
                                creditBills.map(b => (
                                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '4px 0' }}>
                                        <span>{b.customerName}</span>
                                        <span><b>₹{Number(b.total || b.amount).toFixed(2)}</b> <Trash2 size={12} color="red" style={{ cursor: 'pointer', marginLeft: '5px' }} onClick={() => handleDeleteBill(b.id)} /></span>
                                    </div>
                                ))
                            ) : <span style={{ color: '#cbd5e1' }}>No credit bills added.</span>}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Daily Settlement (Manual UPI) & Overall Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Section 4: Daily Settlement Logic (Manual UPI) */}
                    <div className="card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#334155' }}>Daily Settlement (Manual UPI)</h3>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                <span>Pump Recorded UPI Sum:</span>
                                <span style={{ fontWeight: 'bold' }}>₹ {totalUpiCollected.toFixed(2)}</span>
                            </div>
                            
                            <div style={{ marginTop: '6px' }}>
                                <InputRow label="MANUAL UPI (BANK/APP)" val={manualUpiSettlement} setVal={setManualUpiSettlement} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                                <span>Yesterday Pending:</span>
                                <span>₹ {Number(yesterdayPending).toFixed(2)}</span>
                            </div>

                            <div style={{ marginTop: '4px' }}>
                                <InputRow label="(-) TODAY PENDING (SHORTAGE)" val={todayPendingInput} setVal={setTodayPendingInput} />
                            </div>

                            <div style={{ borderTop: '2px solid #334155', paddingTop: '10px', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>RECONCILIATION DIFF:</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: settlement_difference >= 0 ? '#10b981' : '#ef4444' }}>
                                    ₹ {settlement_difference.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', background: '#334155' }} onClick={handleCloseShift}>
                            <Save size={18} style={{ marginRight: '8px' }} /> Save & Export Reconciliation
                        </button>
                    </div>

                    {/* Overall Summary Card */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Overall Sales Summary</h3>
                        <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Total Petrol Sold:</span>
                                <span style={{ fontWeight: 'bold' }}>{totalPetrolLitres.toFixed(2)} L</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Total Diesel Sold:</span>
                                <span style={{ fontWeight: 'bold' }}>{totalDieselLitres.toFixed(2)} L</span>
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Total Sales Amount:</span>
                                <span style={{ fontWeight: 'bold', color: '#0284c7' }}>₹ {totalSaleAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Total Cash:</span>
                                <span>₹ {totalCashCollected.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Manual UPI Settlement:</span>
                                <span style={{ fontWeight: 'bold', color: '#10b981' }}>₹ {manualUpiVal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Total Card:</span>
                                <span>₹ {totalCardCollected.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Total Credit:</span>
                                <span>₹ {totalCreditCollected.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Pump Modal */}
            {showAddPumpModal && (
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
                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Add New Pump</h3>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Pump Name / Number</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={newPumpName} 
                                onChange={e => setNewPumpName(e.target.value)} 
                                placeholder="e.g. Pump 560" 
                                autoFocus 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddPump}>
                                Save Pump
                            </button>
                            <button className="btn btn-secondary" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setShowAddPumpModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftSales;
