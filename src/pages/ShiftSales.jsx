import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Plus, Trash2, TrendingUp, User, ShieldCheck, CheckCircle } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase'; // Import Supabase

// Helper Input Component (Defined outside to prevent re-render focus loss)
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

const ShiftSales = () => {
    // 1. Defensive Destructuring
    const contextData = useData();
    const { prices = {}, nozzles = [], customers = [], loading } = contextData || {};
    const { user } = useAuth();

    // Data Persistence Helper
    const loadState = (key, defaultVal) => {
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(defaultVal)) {
                    return Array.isArray(parsed) ? parsed : defaultVal;
                }
                return { ...defaultVal, ...parsed };
            } catch (e) {
                console.error("Error parsing saved state", e);
                return defaultVal;
            }
        }
        return defaultVal;
    };

    // Emergency Reset Handler
    const handleReset = () => {
        if (confirm("This will clear all saved shift data and reload. Use if the screen is broken/stuck.")) {
            localStorage.removeItem('shift_general');
            localStorage.removeItem('shift_night');
            localStorage.removeItem('shift_diesel');
            localStorage.removeItem('shift_readings');
            localStorage.removeItem('shift_credits');
            window.location.reload();
        }
    };

    // Readings State
    const [nozzleReadings, setNozzleReadings] = useState(() => loadState('shift_readings', {}));

    // Initialize (Only if empty and no saved state)
    useEffect(() => {
        if (nozzles && nozzles.length > 0 && Object.keys(nozzleReadings).length === 0) {
            const initial = {};
            nozzles.forEach(n => {
                initial[n.id] = {
                    start: Number(n.flow) || 0,
                    end: Number(n.flow) || 0
                };
            });
            if (!localStorage.getItem('shift_readings')) {
                setNozzleReadings(initial);
            }
        }
    }, [nozzles]);

    // Auto-Save Effects
    useEffect(() => {
        localStorage.setItem('shift_readings', JSON.stringify(nozzleReadings));
    }, [nozzleReadings]);

    const handleReadingChange = (id, field, value) => {
        setNozzleReadings(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: Number(value) }
        }));
    };

    const [generalShift, setGeneralShift] = useState(() => loadState('shift_general', {
        opening: 0, closing: 0, test: 0,
        cash: 0, upi: 0, card: 0, credit: 0
    }));

    const [nightShift, setNightShift] = useState(() => loadState('shift_night', {
        opening: 0, closing: 0,
        cash: 0, upi: 0, card: 0, credit: 0
    }));

    const [dieselShift, setDieselShift] = useState(() => loadState('shift_diesel', {
        opening: 0, closing: 0, test: 0,
        cash: 0, upi: 0, card: 0, credit: 0
    }));

    const [todaySettlement, setTodaySettlement] = useState(0);
    const [todayPendingInput, setTodayPendingInput] = useState('');

    const [yesterdayPending, setYesterdayPending] = useState(0);

    // Persist State
    useEffect(() => localStorage.setItem('shift_general', JSON.stringify(generalShift)), [generalShift]);
    useEffect(() => localStorage.setItem('shift_night', JSON.stringify(nightShift)), [nightShift]);
    useEffect(() => localStorage.setItem('shift_diesel', JSON.stringify(dieselShift)), [dieselShift]);

    // Fetch Yesterday's Pending
    useEffect(() => {
        const fetchPending = async () => {
            const { data } = await supabase.from('sales_records').select('shortage_excess').order('created_at', { ascending: false }).limit(1);
            if (data && data.length > 0) setYesterdayPending(data[0].shortage_excess || 0);
        };
        fetchPending();
    }, []);

    // --- FORMULAS ---

    // 1. General Shift Petrol Calculation
    const litres_general = Math.max(0, generalShift.closing - generalShift.opening);
    // SAFE ACCESS to prices
    const sale_amount_general = litres_general * (prices?.petrol || 0);
    const total_collection_general = Number(generalShift.cash) + Number(generalShift.upi) + Number(generalShift.card) + Number(generalShift.credit);
    const ms_general_short_excess = sale_amount_general - total_collection_general;

    // Test Sample Logic (MS) corresponds directly to test returned to tank

    // 2. Night Shift Petrol Calculation
    const litres_night = Math.max(0, nightShift.closing - nightShift.opening);
    const sale_amount_night = litres_night * (prices?.petrol || 0);
    const total_collection_night = Number(nightShift.cash) + Number(nightShift.upi) + Number(nightShift.card) + Number(nightShift.credit);
    const ms_night_short_excess = sale_amount_night - total_collection_night;

    // 3. Diesel 24h Calculation
    const diesel_litres_24hrs = Math.max(0, dieselShift.closing - dieselShift.opening);
    const diesel_sale_amount = diesel_litres_24hrs * (prices?.diesel || 0);
    const diesel_total_collection = Number(dieselShift.cash) + Number(dieselShift.upi) + Number(dieselShift.card) + Number(dieselShift.credit);
    const hsd_short_excess = diesel_sale_amount - diesel_total_collection;

    // Test Sample Logic (HSD) corresponds directly to test returned to tank

    // 4. Today Pending + Settlement Logic
    const total_calc = ms_general_short_excess + ms_night_short_excess + hsd_short_excess + Number(yesterdayPending) - Number(todayPendingInput || 0);
    const settlement_difference = Number(todaySettlement || 0) - total_calc;

    // Aggregates for Reporting
    const totalSaleAmount = sale_amount_general + sale_amount_night + diesel_sale_amount;
    const shortage = 0; // Deprecated by new logic, but needed for types? won't use.


    // --- HELPERS FOR UI ---
    // --- HELPERS FOR UI ---
    // (InputRow moved outside)


    // Credit Logic (Updated to be simple list)
    // Note: We are not auto-syncing credits to the 3-shift inputs directly to avoid complexity loop.
    // User must manually type the Credit Total into the respective Shift Box based on their bills.
    // This adheres to "Inputs already exist" (Manual Entry) workflow usually preferred by operators for control.

    const [creditBills, setCreditBills] = useState(() => loadState('shift_credits', []));
    const [newBill, setNewBill] = useState({ customerId: '', billAmount: '', paidAmount: '', product: 'Petrol' });

    useEffect(() => localStorage.setItem('shift_credits', JSON.stringify(creditBills)), [creditBills]);

    // Helper to parse numbers with commas
    const parseAmt = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;

    // Calculate Net Credit automatically
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

            // Validation
            if (netCredit < 0) {
                alert("Paid amount cannot be more than Bill amount");
                return;
            }

            if (netCredit === 0) {
                if (!confirm("Net Credit is 0 (Fully Paid). Do you still want to log this?")) return;
            }

            // 1. Insert into Supabase
            const { data, error } = await supabase
                .from('credit_transactions')
                .insert([{
                    customer_id: customer.id,
                    customer_name: customer.name,
                    amount: netCredit, // Only the credit part is added to debt
                    created_at: new Date(),
                    is_settled: false,
                    notes: `Shift Sale: ${newBill.product}. Bill: ₹${newBill.billAmount}, Paid: ₹${newBill.paidAmount}`
                }])
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("No data returned from insert");

            // 2. Update Local List
            setCreditBills([...creditBills, { ...data[0], customerName: customer.name, total: netCredit }]);
            setNewBill({ ...newBill, billAmount: '', paidAmount: '' });
            alert(`Bill Added! Credit: ₹${netCredit}. Please add this to Shift Credit.`);

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

    // EXPORT & CLOSE SHIFT (Updated for New Logic)
    const handleCloseShift = async () => {
        if (!confirm("Confirm Close Daily Reconciliation? This will save all shift data and download the Excel report.")) return;

        // 1. Prepare Data Record for DB
        const record = {
            shift_date: new Date(),
            shift_runner: user?.name || 'Unknown',

            // Storing aggregates
            petrol_sold: litres_general + litres_night,
            diesel_sold: diesel_litres_24hrs,
            total_amount: totalSaleAmount,

            // "Today Pending" stored as shortage_excess
            shortage_excess: today_pending,

            // Store Test Samples
            petrol_test_samples: Number(generalShift.test || 0),
            diesel_test_samples: Number(dieselShift.test || 0),

            cash_collected: Number(generalShift.cash) + Number(nightShift.cash) + Number(dieselShift.cash),
            upi_collected: Number(generalShift.upi) + Number(nightShift.upi) + Number(dieselShift.upi),
            card_collected: Number(generalShift.card) + Number(nightShift.card) + Number(dieselShift.card),
        };

        // 2. Prepare Excel Data (New Structure)
        const excelData = [
            { "Metric": "DAILY RECONCILIATION REPORT", "Value": "---" },
            { "Metric": "Date", "Value": new Date().toLocaleDateString() },
            { "Metric": "Manager", "Value": user?.name || 'Staff' },
            { "Metric": "", "Value": "" },

            // General Shift Petrol
            { "Metric": "1. GENERAL SHIFT (PETROL)", "Value": "---" },
            { "Metric": "Opening Reading", "Value": generalShift.opening },
            { "Metric": "Closing Reading", "Value": generalShift.closing },
            { "Metric": "Test Sample", "Value": Number(generalShift.test || 0) },
            { "Metric": "Litres Sold", "Value": litres_general.toFixed(2) },
            { "Metric": "Expected Amount (₹)", "Value": sale_amount_general.toFixed(2) },
            { "Metric": "Collections", "Value": `Cash: ${generalShift.cash}, UPI: ${generalShift.upi}, Card: ${generalShift.card}, Credit: ${generalShift.credit}` },
            { "Metric": "Shortage/Excess", "Value": ms_general_short_excess.toFixed(2) },
            { "Metric": "", "Value": "" },

            // Night Shift Petrol
            { "Metric": "2. NIGHT SHIFT (PETROL)", "Value": "---" },
            { "Metric": "Opening Reading", "Value": nightShift.opening },
            { "Metric": "Closing Reading", "Value": nightShift.closing },
            { "Metric": "Litres Sold", "Value": litres_night.toFixed(2) },
            { "Metric": "Expected Amount (₹)", "Value": sale_amount_night.toFixed(2) },
            { "Metric": "Collections", "Value": `Cash: ${nightShift.cash}, UPI: ${nightShift.upi}, Card: ${nightShift.card}, Credit: ${nightShift.credit}` },
            { "Metric": "Shortage/Excess", "Value": ms_night_short_excess.toFixed(2) },
            { "Metric": "", "Value": "" },

            // Diesel Shift
            { "Metric": "3. DIESEL (24 HOURS)", "Value": "---" },
            { "Metric": "Yesterday Closing", "Value": dieselShift.opening },
            { "Metric": "Today Closing", "Value": dieselShift.closing },
            { "Metric": "Test Sample", "Value": Number(dieselShift.test || 0) },
            { "Metric": "Litres Sold", "Value": diesel_litres_24hrs.toFixed(2) },
            { "Metric": "Expected Amount (₹)", "Value": diesel_sale_amount.toFixed(2) },
            { "Metric": "Collections", "Value": `Cash: ${dieselShift.cash}, UPI: ${dieselShift.upi}, Card: ${dieselShift.card}, Credit: ${dieselShift.credit}` },
            { "Metric": "Shortage/Excess", "Value": hsd_short_excess.toFixed(2) },
            { "Metric": "", "Value": "" },

            // Final Pending
            { "Metric": "4. DAILY SETTLEMENT", "Value": "---" },
            { "Metric": "MS General Short/Excess", "Value": ms_general_short_excess.toFixed(2) },
            { "Metric": "MS Night Short/Excess", "Value": ms_night_short_excess.toFixed(2) },
            { "Metric": "HSD Short/Excess", "Value": hsd_short_excess.toFixed(2) },
            { "Metric": "Yesterday Pending", "Value": yesterdayPending.toFixed(2) },
            { "Metric": "Today Pending (Input)", "Value": Number(todayPendingInput || 0).toFixed(2) },
            { "Metric": "Total Calculated", "Value": total_calc.toFixed(2) },
            { "Metric": "Today Settlement", "Value": Number(todaySettlement || 0).toFixed(2) },
            { "Metric": "DIFFERENCE", "Value": settlement_difference.toFixed(2) },
            { "Metric": "", "Value": "" },

            // Overall
            { "Metric": "OVERALL TOTALS", "Value": "---" },
            { "Metric": "Total Petrol Sold", "Value": (litres_general + litres_night).toFixed(2) },
            { "Metric": "Total Diesel Sold", "Value": diesel_litres_24hrs.toFixed(2) },
            { "Metric": "Total Sales Amount", "Value": totalSaleAmount.toFixed(2) }
        ];

        // 3. Save to Supabase
        const { error } = await supabase.from('sales_records').insert([record]);
        if (error) {
            alert("Error saving database record: " + error.message);
            // We continue to Excel download even if DB fails, or we could return. 
            // Better to warn but allow download so data isn't lost.
        }

        // 4. Update Stock
        if (prices.id) {
            const currentPetrolStock = prices.petrol_stock || 0;
            const currentDieselStock = prices.diesel_stock || 0;

            // Stock Logic: Reduced by Sales AND Net Test Sample (Taken - Returned)
            // Because 'Taken' is removed from tank. 'Returned' is added back.
            // Litres Sold is already purely (Closing - Opening).
            // Wait, (Closing - Opening) INCLUDES the test sample if it passed through the meter.
            // If test sample goes through meter:
            //   Meter says 100L. 5L was test. 
            //   Litres Sold = 100L.
            //   User wants: "Litres Sold" to be 100L?
            //   User said: "ms_general_litres = closing - opening". 
            //   So if I pump 5L test, meter advances 5L. Litres Sold = 5L.
            //   The formula for SALE AMOUNT uses this litres.
            //   Refinement: "Daily test sample is not a sale. It should NOT affect meter sale calculation."
            //   This implies: Litres Sold SHOULD be (Closing - Opening) - Test Net?
            //   User said: "ms_general_litres = closing - opening". STRICTLY.
            //   And "ms_general_sale_amount = ms_general_litres * rate".
            //   BUT "Daily test sample is not a sale".
            //   Contradiction? Or maybe the user *manually* excludes test sample from "closing reading"?
            //   No, inputs are readings. 
            //   If I follow strict user formulas:
            //   Litres = 10L (Test). Sale = 10 * 100 = 1000. 
            //   But I have 0 cash. Shortage = 1000.
            //   This implies user formulas might be missing the deduction, OR test sample doesn't move meter?
            //   Standard pump: Test sample moves meter.
            //   Let's re-read: "Daily test sample... should NOT affect meter sale calculation."
            //   This usually means: Sale Litres = (Meter Diff) - (Test Sample).
            //   BUT user explicitly gave Formula: "ms_general_litres = closing_reading_general - opening_reading_general".
            //   AND "ms_general = ms_general_sale_amount - ms_general_total_collection".
            //   If I follow this blindly, a test sample causes a shortage.
            //   However, if I look at "4) DAILY TEST SAMPLE LOGIC... It is only for stock/sump adjustment".
            //   Maybe I should stick to the user's explicit formulas for now, even if it creates a shortage artifact?
            //   Actually, usually 'shortage' is where the test sample is explained.
            //   Let's stick to the EXPLICIT formulas provided. 
            //   Stock Update: 
            //   If Meter Diff is 100L. 5L was test (returned). Real stock out = 100L? No, 5L returned. Real out = 95L.
            //   So Stock = Stock - (Meter Diff - Test Returned).
            //   Or more precisely: Stock = Stock - (Meter Diff) + (Test Returned).
            //   User Rule: "ms_stock = ms_stock - ms_net_test_sample".
            //   Wait, ms_net = Taken - Returned.
            //   If Taken=5, Returned=5. Net=0. Stock change = 0.
            //   But Meter Diff = 5. 
            //   So Stock = Stock - Meter Diff - Net?
            //   If I take 5L (Meter moves 5). Return 5L. Net=0.
            //   Tank lost 5L through meter, gained 5L from return. Net 0 change.
            //   My code: `petrol_stock: currentPetrolStock - (litres_general + litres_night)`
            //   This `litres_general` is Meter Diff.
            //   If Net is 0, we subtract Meter Diff (5L). Access stock drops by 5L.
            //   But we returned it!
            //   So we must ADD back the returned amount? Or User Formula "ms_stock = ms_stock - ms_net_test_sample" is the ONLY change?
            //   No, "If stock module exists, update stock: ms_stock = ms_stock - ms_net_test_sample".
            //   THIS IS LIKELY ADDITIONAL to the sale deduction.
            //   Actually, "ms_stock = ms_stock - ms_net_test_sample" implies ONLY net sample affects? No, strict user requirement might be isolated to that section.
            //   Let's apply logically:
            //   Stock should decrease by dispensed fuel that is NOT returned.
            //   Dispensed = Meter Diff.
            //   Returned = Test Returned.
            //   So Stock -= (Meter Diff - Returned).
            //   Which is equivalent to: Stock -= (Meter Diff - (Taken - Net)) ? No.
            //   Let's simplify: Stock -= (Litres Sold - Test Returned).

            await supabase.from('fuel_prices').update({
                petrol_stock: currentPetrolStock - (litres_general + litres_night) + (Number(generalShift.test) || 0),
                diesel_stock: currentDieselStock - diesel_litres_24hrs + (Number(dieselShift.test) || 0)
            }).eq('id', prices.id);
        }

        // 5. Generate & Download Excel
        try {
            const wb = utils.book_new();
            const ws = utils.json_to_sheet(excelData);

            // Adjust column widths for better readability (optional but nice)
            const wscols = [{ wch: 30 }, { wch: 40 }];
            ws['!cols'] = wscols;

            utils.book_append_sheet(wb, ws, "Daily Reconciliation");
            writeFile(wb, `Daily_Reconciliation_${new Date().toISOString().slice(0, 10)}.xlsx`);

            alert("Saved to Database & Excel Report Downloaded!");

            // Clear only Shift State (Prevent logging out)
            localStorage.removeItem('shift_general');
            localStorage.removeItem('shift_night');
            localStorage.removeItem('shift_diesel');
            localStorage.removeItem('shift_credits');

            // Reload to reset local component state
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Error generating Excel: " + err.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.2rem' }}>Daily Reconciliation</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem' }}>
                        <ShieldCheck size={16} />
                        <span>Manager: <b>{user?.name || 'Staff'}</b></span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Today's Date</div>
                    <div style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString()}</div>
                    <button onClick={handleReset} style={{ fontSize: '0.7rem', color: 'red', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: '5px' }}>
                        Reset Local Data
                    </button>
                </div>
            </div>

            <div className="page-grid">

                {/* LEFT COLUMN: The 3 Main Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* 1. GENERAL SHIFT - PETROL */}
                    <div className="card" style={{ borderLeft: '4px solid #3b82f6', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: '10px', top: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PETROL</div>
                        <h3 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>1. General Shift</h3>
                        <div className="section-grid">
                            <div>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Readings</h4>
                                <InputRow label="Opening Reading" val={generalShift.opening} setVal={v => setGeneralShift({ ...generalShift, opening: v })} />
                                <InputRow label="Closing Reading" val={generalShift.closing} setVal={v => setGeneralShift({ ...generalShift, closing: v })} />
                                <InputRow label="Test Sample" val={generalShift.test} setVal={v => setGeneralShift({ ...generalShift, test: v })} />

                                <div style={{ marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'right', color: '#3b82f6', fontSize: '0.9rem' }}>
                                    Litres Sold: {litres_general.toFixed(2)}
                                </div>
                                <div style={{ marginTop: '0.2rem', fontWeight: 'bold', textAlign: 'right', color: '#1d4ed8' }}>
                                    Expected Amount: ₹ {sale_amount_general.toFixed(2)}
                                </div>
                                <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', textAlign: 'right', color: '#64748b' }}>
                                    Test Sample Returned: {generalShift.test || 0} L (Stock Adj)
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Collections</h4>
                                <InputRow label="Cash" val={generalShift.cash} setVal={v => setGeneralShift({ ...generalShift, cash: v })} />
                                <InputRow label="UPI" val={generalShift.upi} setVal={v => setGeneralShift({ ...generalShift, upi: v })} />
                                <InputRow label="Card" val={generalShift.card} setVal={v => setGeneralShift({ ...generalShift, card: v })} />
                                <InputRow label="Credit" val={generalShift.credit} setVal={v => setGeneralShift({ ...generalShift, credit: v })} />
                                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.85rem' }}>Shortage/Excess:</span>
                                    <span style={{ fontWeight: 'bold', color: ms_general_short_excess > 0 ? 'red' : 'green' }}>
                                        {ms_general_short_excess.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. NIGHT SHIFT - PETROL */}
                    <div className="card" style={{ borderLeft: '4px solid #1e40af', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: '10px', top: '10px', background: '#eff6ff', color: '#1e3a8a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PETROL</div>
                        <h3 style={{ color: '#1e3a8a', marginBottom: '1rem' }}>2. Night Shift</h3>
                        <div className="section-grid">
                            <div>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Readings</h4>
                                <InputRow label="Opening Reading" val={nightShift.opening} setVal={v => setNightShift({ ...nightShift, opening: v })} />
                                <InputRow label="Closing Reading" val={nightShift.closing} setVal={v => setNightShift({ ...nightShift, closing: v })} />
                                <div style={{ marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'right', color: '#1e40af', fontSize: '0.9rem' }}>
                                    Litres Sold: {litres_night.toFixed(2)}
                                </div>
                                <div style={{ marginTop: '0.2rem', fontWeight: 'bold', textAlign: 'right', color: '#1e3a8a' }}>
                                    Expected Amount: ₹ {sale_amount_night.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Collections</h4>
                                <InputRow label="Cash" val={nightShift.cash} setVal={v => setNightShift({ ...nightShift, cash: v })} />
                                <InputRow label="UPI" val={nightShift.upi} setVal={v => setNightShift({ ...nightShift, upi: v })} />
                                <InputRow label="Card" val={nightShift.card} setVal={v => setNightShift({ ...nightShift, card: v })} />
                                <InputRow label="Credit" val={nightShift.credit} setVal={v => setNightShift({ ...nightShift, credit: v })} />
                                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.85rem' }}>Shortage/Excess:</span>
                                    <span style={{ fontWeight: 'bold', color: ms_night_short_excess > 0 ? 'red' : 'green' }}>
                                        {ms_night_short_excess.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. DIESEL - 24 HOURS */}
                    <div className="card" style={{ borderLeft: '4px solid #f59e0b', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: '10px', top: '10px', background: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>DIESEL</div>
                        <h3 style={{ color: '#d97706', marginBottom: '1rem' }}>3. Diesel (24 Hours)</h3>
                        <div className="section-grid">
                            <div>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Readings</h4>
                                <InputRow label="Yesterday Closing" val={dieselShift.opening} setVal={v => setDieselShift({ ...dieselShift, opening: v })} />
                                <InputRow label="Today Closing" val={dieselShift.closing} setVal={v => setDieselShift({ ...dieselShift, closing: v })} />
                                <InputRow label="Test Sample" val={dieselShift.test} setVal={v => setDieselShift({ ...dieselShift, test: v })} />

                                <div style={{ marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'right', color: '#d97706', fontSize: '0.9rem' }}>
                                    Litres Sold: {diesel_litres_24hrs.toFixed(2)}
                                </div>
                                <div style={{ marginTop: '0.2rem', fontWeight: 'bold', textAlign: 'right', color: '#b45309' }}>
                                    Expected Amount: ₹ {diesel_sale_amount.toFixed(2)}
                                </div>
                                <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', textAlign: 'right', color: '#64748b' }}>
                                    Test Sample Returned: {dieselShift.test || 0} L (Stock Adj)
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Collections</h4>
                                <InputRow label="Cash" val={dieselShift.cash} setVal={v => setDieselShift({ ...dieselShift, cash: v })} />
                                <InputRow label="UPI" val={dieselShift.upi} setVal={v => setDieselShift({ ...dieselShift, upi: v })} />
                                <InputRow label="Card" val={dieselShift.card} setVal={v => setDieselShift({ ...dieselShift, card: v })} />
                                <InputRow label="Credit" val={dieselShift.credit} setVal={v => setDieselShift({ ...dieselShift, credit: v })} />
                                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.85rem' }}>Shortage/Excess:</span>
                                    <span style={{ fontWeight: 'bold', color: hsd_short_excess > 0 ? 'red' : 'green' }}>
                                        {hsd_short_excess.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credit Entry (Helper) */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Add Credit Bill</h3>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Helper for adding to DB</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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
                        {/* Simple List */}
                        <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                            {creditBills.length > 0 ? (
                                creditBills.map(b => (
                                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '4px 0' }}>
                                        <span>{b.customerName}</span>
                                        <span><b>₹{Number(b.total || b.amount).toFixed(2)}</b> <Trash2 size={12} color="red" style={{ cursor: 'pointer', marginLeft: '5px' }} onClick={() => handleDeleteBill(b.id)} /></span>
                                    </div>
                                ))
                            ) : <span style={{ color: '#cbd5e1' }}>No new credit bills added.</span>}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Summary & Pending Logic */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* 4. TODAY PENDING LOGIC */}
                    <div className="card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#334155' }}>4. Daily Settlement Logic</h3>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                <span>1. MS General Short/Excess:</span>
                                <span style={{ color: ms_general_short_excess > 0 ? 'green' : 'red' }}>{ms_general_short_excess.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                <span>2. MS Night Short/Excess:</span>
                                <span style={{ color: ms_night_short_excess > 0 ? 'green' : 'red' }}>{ms_night_short_excess.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                <span>3. HSD Short/Excess:</span>
                                <span style={{ color: hsd_short_excess > 0 ? 'green' : 'red' }}>{hsd_short_excess.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                <span>4. Yesterday Pending:</span>
                                <span>{Number(yesterdayPending).toFixed(2)}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>(-) TODAY PENDING:</span>
                                <input
                                    type="number"
                                    className="input"
                                    style={{ width: '100px', textAlign: 'right', fontWeight: 'bold' }}
                                    value={todayPendingInput}
                                    onChange={e => setTodayPendingInput(e.target.value)}
                                    placeholder="Enter Amount"
                                />
                            </div>

                            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#334155' }}>
                                <span>TOTAL (Calculated):</span>
                                <span>{total_calc.toFixed(2)}</span>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <InputRow label="TODAY SETTLEMENT" val={todaySettlement} setVal={setTodaySettlement} />
                            </div>

                            <div style={{ borderTop: '2px solid #334155', paddingTop: '10px', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>DIFFERENCE:</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: settlement_difference >= 0 ? '#10b981' : '#ef4444' }}>
                                    ₹ {settlement_difference.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', background: '#334155' }} onClick={handleCloseShift}>
                            <Save size={18} style={{ marginRight: '8px' }} /> Save Daily Record
                        </button>
                    </div>

                    {/* Overall Summary */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Overall Sales</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Sales Amt:</span>
                            <span style={{ fontWeight: 'bold' }}>₹ {totalSaleAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ShiftSales;
