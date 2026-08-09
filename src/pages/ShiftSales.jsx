import React, { useState, useEffect, useMemo } from 'react';
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

const migratePumpSalesData = (saved) => {
    if (!saved) return null;
    const migrated = {};
    Object.keys(saved).forEach(pumpId => {
        const entry = saved[pumpId];
        if (entry && (entry.petrolPayments || entry.dieselPayments)) {
            migrated[pumpId] = {
                petrol1: {
                    opening: Number(entry.petrol1?.opening || 0),
                    closing: Number(entry.petrol1?.closing || 0),
                    test: Number(entry.petrol1?.test || 0)
                },
                petrol2: {
                    opening: Number(entry.petrol2?.opening || 0),
                    closing: Number(entry.petrol2?.closing || 0),
                    test: Number(entry.petrol2?.test || 0)
                },
                petrolPayments: {
                    cash: Number(entry.petrolPayments?.cash || 0),
                    upi: Number(entry.petrolPayments?.upi || 0),
                    card: Number(entry.petrolPayments?.card || 0)
                },
                diesel1: {
                    opening: Number(entry.diesel1?.opening || 0),
                    closing: Number(entry.diesel1?.closing || 0),
                    test: Number(entry.diesel1?.test || 0)
                },
                diesel2: {
                    opening: Number(entry.diesel2?.opening || 0),
                    closing: Number(entry.diesel2?.closing || 0),
                    test: Number(entry.diesel2?.test || 0)
                },
                dieselPayments: {
                    cash: Number(entry.dieselPayments?.cash || 0),
                    upi: Number(entry.dieselPayments?.upi || 0),
                    card: Number(entry.dieselPayments?.card || 0)
                }
            };
        } else if (entry) {
            const petrolCash = Number(entry.petrol1?.cash || 0) + Number(entry.petrol2?.cash || 0);
            const petrolUpi = Number(entry.petrol1?.upi || 0) + Number(entry.petrol2?.upi || 0);
            const petrolCard = Number(entry.petrol1?.card || 0) + Number(entry.petrol2?.card || 0);

            const dieselCash = Number(entry.diesel1?.cash || 0) + Number(entry.diesel2?.cash || 0);
            const dieselUpi = Number(entry.diesel1?.upi || 0) + Number(entry.diesel2?.upi || 0);
            const dieselCard = Number(entry.diesel1?.card || 0) + Number(entry.diesel2?.card || 0);

            migrated[pumpId] = {
                petrol1: {
                    opening: Number(entry.petrol1?.opening || 0),
                    closing: Number(entry.petrol1?.closing || 0),
                    test: Number(entry.petrol1?.test || 0)
                },
                petrol2: {
                    opening: Number(entry.petrol2?.opening || 0),
                    closing: Number(entry.petrol2?.closing || 0),
                    test: Number(entry.petrol2?.test || 0)
                },
                petrolPayments: {
                    cash: petrolCash,
                    upi: petrolUpi,
                    card: petrolCard
                },
                diesel1: {
                    opening: Number(entry.diesel1?.opening || 0),
                    closing: Number(entry.diesel1?.closing || 0),
                    test: Number(entry.diesel1?.test || 0)
                },
                diesel2: {
                    opening: Number(entry.diesel2?.opening || 0),
                    closing: Number(entry.diesel2?.closing || 0),
                    test: Number(entry.diesel2?.test || 0)
                },
                dieselPayments: {
                    cash: dieselCash,
                    upi: dieselUpi,
                    card: dieselCard
                }
            };
        }
    });
    return migrated;
};

const DEFAULT_PUMP_ENTRY = () => ({
    petrol1: { opening: 0, closing: 0, test: 0 },
    petrol2: { opening: 0, closing: 0, test: 0 },
    petrolPayments: { cash: 0, upi: 0, card: 0 },
    diesel1: { opening: 0, closing: 0, test: 0 },
    diesel2: { opening: 0, closing: 0, test: 0 },
    dieselPayments: { cash: 0, upi: 0, card: 0 }
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
        if (saved) {
            const migrated = migratePumpSalesData(saved);
            localStorage.setItem('pump_sales_data', JSON.stringify(migrated));
            return migrated;
        }
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

    // Section 4: Daily Settlement & Overall Sales Summary Logic
    const [pumpUpiInputs, setPumpUpiInputs] = useState(() => loadState('pump_upi_inputs_summary', {}));
    const [actualAmountInput, setActualAmountInput] = useState(() => loadState('actual_amount_summary', ''));
    const [ledgerTransactions, setLedgerTransactions] = useState([]);

    useEffect(() => {
        localStorage.setItem('pump_upi_inputs_summary', JSON.stringify(pumpUpiInputs));
    }, [pumpUpiInputs]);

    useEffect(() => {
        localStorage.setItem('actual_amount_summary', String(actualAmountInput));
    }, [actualAmountInput]);

    // Fetch Credit Ledger transactions
    useEffect(() => {
        const fetchLedger = async () => {
            if (!supabase) return;
            try {
                const { data, error } = await supabase
                    .from('credit_transactions')
                    .select('*')
                    .order('created_at', { ascending: true });
                if (!error && data) {
                    setLedgerTransactions(data);
                }
            } catch (e) {
                console.error("Error fetching credit ledger:", e);
            }
        };
        fetchLedger();
    }, []);

    // Calculate outstanding balances dynamically
    const getOutstandingBalanceAsOf = (dateStr) => {
        const cutoff = new Date(`${dateStr}T23:59:59.999Z`);
        let balance = 0;
        
        ledgerTransactions.forEach(t => {
            const txDate = new Date(t.created_at);
            if (txDate <= cutoff) {
                const amount = Number(t.amount) || 0;
                const type = t.type || 'Petrol Given';
                
                if (type === 'Payment Received') {
                    balance -= amount;
                } else {
                    balance += amount;
                    if (t.is_settled && !t.type) {
                        balance -= amount;
                    }
                }
            }
        });
        return balance;
    };

    const yesterdayPending = useMemo(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return getOutstandingBalanceAsOf(yesterdayStr);
    }, [ledgerTransactions]);

    const todayPending = useMemo(() => {
        return ledgerTransactions.reduce((acc, t) => {
            const amount = Number(t.amount) || 0;
            const type = t.type || 'Petrol Given';
            if (type === 'Payment Received') {
                return acc - amount;
            } else {
                let val = acc + amount;
                if (t.is_settled && !t.type) {
                    val -= amount;
                }
                return val;
            }
        }, 0);
    }, [ledgerTransactions]);

    const handleUpdatePumpUpi = (pumpId, val) => {
        setPumpUpiInputs(prev => ({
            ...prev,
            [pumpId]: val
        }));
    };

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

    // Calculate figures for a nozzle entry (opening, closing, test)
    const getNozzleMetrics = (entry, fuelType) => {
        const opening = Number(entry?.opening || 0);
        const closing = Number(entry?.closing || 0);
        const test = Number(entry?.test || 0);
        const litres = Math.max(0, closing - opening - test);
        const rate = fuelType === 'Petrol' ? Number(prices?.petrol || 0) : Number(prices?.diesel || 0);
        const saleAmount = litres * rate;

        return { litres, saleAmount };
    };

    // Calculate figures for combined payments (cash, upi, card)
    const getPaymentMetrics = (payments, expectedSaleAmount) => {
        const cash = Number(payments?.cash || 0);
        const upi = Number(payments?.upi || 0);
        const card = Number(payments?.card || 0);
        const totalCollections = cash + upi + card;
        const shortageExcess = expectedSaleAmount - totalCollections;

        return { cash, upi, card, totalCollections, shortageExcess };
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

        // Petrol nozzle readings
        const pet1 = getNozzleMetrics(pData.petrol1, 'Petrol');
        const pet2 = getNozzleMetrics(pData.petrol2, 'Petrol');
        totalPetrolLitres += pet1.litres + pet2.litres;
        totalPetrolSaleAmount += pet1.saleAmount + pet2.saleAmount;

        // Petrol payments
        const petPay = pData.petrolPayments || { cash: 0, upi: 0, card: 0 };
        totalCashCollected += Number(petPay.cash || 0);
        totalUpiCollected += Number(petPay.upi || 0);
        totalCardCollected += Number(petPay.card || 0);

        // Diesel nozzle readings
        const die1 = getNozzleMetrics(pData.diesel1, 'Diesel');
        const die2 = getNozzleMetrics(pData.diesel2, 'Diesel');
        totalDieselLitres += die1.litres + die2.litres;
        totalDieselSaleAmount += die1.saleAmount + die2.saleAmount;

        // Diesel payments
        const diePay = pData.dieselPayments || { cash: 0, upi: 0, card: 0 };
        totalCashCollected += Number(diePay.cash || 0);
        totalUpiCollected += Number(diePay.upi || 0);
        totalCardCollected += Number(diePay.card || 0);
    });

    const totalSaleAmount = totalPetrolSaleAmount + totalDieselSaleAmount;
    const totalCollections = totalCashCollected + totalUpiCollected + totalCardCollected;
    const overallShortageExcess = totalSaleAmount - totalCollections;

    // Reconciliation calculations
    const totalPumpUpi = pumpsList.reduce((sum, p) => sum + Number(pumpUpiInputs[p.id] || 0), 0);
    const totalSettlement = totalCashCollected + totalCardCollected + totalPumpUpi;
    const actualAmount = Number(actualAmountInput || 0);
    const settlement_difference = actualAmount - totalSettlement;

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
        if (confirm("Are you sure you want to reset all sales entries to 0?")) {
            localStorage.removeItem('pump_sales_data');
            localStorage.removeItem('manual_upi_settlement');
            localStorage.removeItem('today_pending_input');
            localStorage.removeItem('shift_credits');
            localStorage.removeItem('shift_general');
            localStorage.removeItem('shift_night');
            localStorage.removeItem('shift_diesel');
            localStorage.removeItem('shift_readings');
            
            setManualUpiSettlement('');
            setTodayPendingInput('');
            setCreditBills([]);
            
            const resetData = {};
            pumpsList.forEach(p => {
                resetData[p.id] = DEFAULT_PUMP_ENTRY();
            });
            setPumpSales(resetData);
            localStorage.setItem('pump_sales_data', JSON.stringify(resetData));
            
            alert("All entry fields have been reset to 0!");
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
            shortage_excess: settlement_difference, // save difference / shortage
            today_settlement_amount: totalSettlement,
            cash_collected: totalCashCollected,
            upi_collected: totalPumpUpi,
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

            // Petrol
            const pet1 = getNozzleMetrics(pData.petrol1, 'Petrol');
            const pet2 = getNozzleMetrics(pData.petrol2, 'Petrol');
            const petTotalExpected = pet1.saleAmount + pet2.saleAmount;
            const petTotalLitres = pet1.litres + pet2.litres;
            const petPayments = pData.petrolPayments || { cash: 0, upi: 0, card: 0 };
            const petMetrics = getPaymentMetrics(petPayments, petTotalExpected);

            excelRows.push({ "Metric": "Petrol 1 Litres Sold", "Value": pet1.litres.toFixed(2) });
            excelRows.push({ "Metric": "Petrol 1 Expected Amount (₹)", "Value": pet1.saleAmount.toFixed(2) });
            excelRows.push({ "Metric": "Petrol 2 Litres Sold", "Value": pet2.litres.toFixed(2) });
            excelRows.push({ "Metric": "Petrol 2 Expected Amount (₹)", "Value": pet2.saleAmount.toFixed(2) });
            excelRows.push({ "Metric": "Petrol Combined Litres Sold", "Value": petTotalLitres.toFixed(2) });
            excelRows.push({ "Metric": "Petrol Combined Expected Amount (₹)", "Value": petTotalExpected.toFixed(2) });
            excelRows.push({ "Metric": "Petrol Combined Collections", "Value": `Cash: ${petPayments.cash}, UPI: ${petPayments.upi}, Card: ${petPayments.card}` });
            excelRows.push({ "Metric": "Petrol Combined Shortage/Excess", "Value": petMetrics.shortageExcess.toFixed(2) });

            // Diesel
            const die1 = getNozzleMetrics(pData.diesel1, 'Diesel');
            const die2 = getNozzleMetrics(pData.diesel2, 'Diesel');
            const dieTotalExpected = die1.saleAmount + die2.saleAmount;
            const dieTotalLitres = die1.litres + die2.litres;
            const diePayments = pData.dieselPayments || { cash: 0, upi: 0, card: 0 };
            const dieMetrics = getPaymentMetrics(diePayments, dieTotalExpected);

            excelRows.push({ "Metric": "Diesel 1 Litres Sold", "Value": die1.litres.toFixed(2) });
            excelRows.push({ "Metric": "Diesel 1 Expected Amount (₹)", "Value": die1.saleAmount.toFixed(2) });
            excelRows.push({ "Metric": "Diesel 2 Litres Sold", "Value": die2.litres.toFixed(2) });
            excelRows.push({ "Metric": "Diesel 2 Expected Amount (₹)", "Value": die2.saleAmount.toFixed(2) });
            excelRows.push({ "Metric": "Diesel Combined Litres Sold", "Value": dieTotalLitres.toFixed(2) });
            excelRows.push({ "Metric": "Diesel Combined Expected Amount (₹)", "Value": dieTotalExpected.toFixed(2) });
            excelRows.push({ "Metric": "Diesel Combined Collections", "Value": `Cash: ${diePayments.cash}, UPI: ${diePayments.upi}, Card: ${diePayments.card}` });
            excelRows.push({ "Metric": "Diesel Combined Shortage/Excess", "Value": dieMetrics.shortageExcess.toFixed(2) });

            excelRows.push({ "Metric": "", "Value": "" });
        });

        // Add Settlement Section
        excelRows.push(
            { "Metric": "OVERALL SALES SUMMARY", "Value": "---" },
            { "Metric": "Yesterday Pending", "Value": yesterdayPending.toFixed(2) },
            { "Metric": "Today Pending (Credit Ledger)", "Value": todayPending.toFixed(2) },
            { "Metric": "Cash (Pump Entries)", "Value": totalCashCollected.toFixed(2) },
            { "Metric": "Card (Pump Entries)", "Value": totalCardCollected.toFixed(2) }
        );

        pumpsList.forEach(p => {
            excelRows.push({ "Metric": `${p.name} UPI`, "Value": Number(pumpUpiInputs[p.id] || 0).toFixed(2) });
        });

        excelRows.push(
            { "Metric": "Total Settlement", "Value": totalSettlement.toFixed(2) },
            { "Metric": "Actual Amount Counted", "Value": actualAmount.toFixed(2) },
            { "Metric": "Difference", "Value": settlement_difference.toFixed(2) },
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
            localStorage.removeItem('pump_upi_inputs_summary');
            localStorage.removeItem('actual_amount_summary');
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

                        const renderFuelSection = (fuelType) => {
                            const isPetrol = fuelType === 'Petrol';
                            const key1 = isPetrol ? 'petrol1' : 'diesel1';
                            const key2 = isPetrol ? 'petrol2' : 'diesel2';
                            const payKey = isPetrol ? 'petrolPayments' : 'dieselPayments';
                            
                            const entry1 = pData[key1] || {};
                            const entry2 = pData[key2] || {};
                            const payments = pData[payKey] || {};
                            
                            const m1 = getNozzleMetrics(entry1, fuelType);
                            const m2 = getNozzleMetrics(entry2, fuelType);
                            
                            const totalExpected = m1.saleAmount + m2.saleAmount;
                            const totalLitres = m1.litres + m2.litres;
                            
                            const payMetrics = getPaymentMetrics(payments, totalExpected);
                            
                            const badgeBg = isPetrol ? '#eff6ff' : '#fffbeb';
                            const badgeColor = isPetrol ? '#1d4ed8' : '#b45309';
                            const sectionTitle = isPetrol ? 'Petrol Nozzles & Combined Payments' : 'Diesel Nozzles & Combined Payments';
                            const sectionBorderColor = isPetrol ? '#3b82f6' : '#f59e0b';

                            const showMismatchWarning = Math.abs(payMetrics.shortageExcess) > 0.01;

                            return (
                                <div key={fuelType} style={{ 
                                    border: `1px solid #e2e8f0`, 
                                    borderLeft: `5px solid ${sectionBorderColor}`, 
                                    borderRadius: '8px', 
                                    padding: '1.25rem', 
                                    marginBottom: '1.5rem',
                                    background: '#f8fafc' 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, color: badgeColor, fontSize: '1rem', fontWeight: 'bold' }}>{sectionTitle}</h4>
                                        <span style={{ background: badgeBg, color: badgeColor, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            Rate: ₹{isPetrol ? prices?.petrol || 0 : prices?.diesel || 0}/L
                                        </span>
                                    </div>
                                    
                                    <div className="section-grid">
                                        {/* Readings Column */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Nozzle 1 */}
                                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>{isPetrol ? 'Petrol 1 Nozzle' : 'Diesel 1 Nozzle'}</h5>
                                                <InputRow label="Opening Reading" val={entry1.opening} setVal={v => updateEntry(pump.id, key1, 'opening', v)} />
                                                <InputRow label="Closing Reading" val={entry1.closing} setVal={v => updateEntry(pump.id, key1, 'closing', v)} />
                                                <InputRow label="Test Sample (L)" val={entry1.test} setVal={v => updateEntry(pump.id, key1, 'test', v)} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '6px', color: '#64748b' }}>
                                                    <span>Litres Sold: <b>{m1.litres.toFixed(2)} L</b></span>
                                                    <span>Expected: <b>₹{m1.saleAmount.toFixed(2)}</b></span>
                                                </div>
                                            </div>
                                            
                                            {/* Nozzle 2 */}
                                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>{isPetrol ? 'Petrol 2 Nozzle' : 'Diesel 2 Nozzle'}</h5>
                                                <InputRow label="Opening Reading" val={entry2.opening} setVal={v => updateEntry(pump.id, key2, 'opening', v)} />
                                                <InputRow label="Closing Reading" val={entry2.closing} setVal={v => updateEntry(pump.id, key2, 'closing', v)} />
                                                <InputRow label="Test Sample (L)" val={entry2.test} setVal={v => updateEntry(pump.id, key2, 'test', v)} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '6px', color: '#64748b' }}>
                                                    <span>Litres Sold: <b>{m2.litres.toFixed(2)} L</b></span>
                                                    <span>Expected: <b>₹{m2.saleAmount.toFixed(2)}</b></span>
                                                </div>
                                            </div>

                                            {/* Combined Expected Summary */}
                                            <div style={{ padding: '0.5rem', background: '#e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '500', color: '#334155' }}>
                                                    <span>Total Litres Sold:</span>
                                                    <span>{totalLitres.toFixed(2)} L</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem', marginTop: '4px' }}>
                                                    <span>Total Expected Amt:</span>
                                                    <span>₹ {totalExpected.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Payments Column */}
                                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div>
                                                <h5 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Combined Collections</h5>
                                                <InputRow label="Cash" val={payments.cash} setVal={v => updateEntry(pump.id, payKey, 'cash', v)} />
                                                <InputRow label="UPI" val={payments.upi} setVal={v => updateEntry(pump.id, payKey, 'upi', v)} />
                                                <InputRow label="Card" val={payments.card} setVal={v => updateEntry(pump.id, payKey, 'card', v)} />
                                            </div>

                                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                                                    <span>Total Collections:</span>
                                                    <span style={{ fontWeight: '600', color: '#334155' }}>₹ {payMetrics.totalCollections.toFixed(2)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                                    <span>Difference:</span>
                                                    <span style={{ fontWeight: 'bold', color: payMetrics.shortageExcess === 0 ? '#10b981' : '#ef4444' }}>
                                                        ₹ {payMetrics.shortageExcess.toFixed(2)}
                                                    </span>
                                                </div>
                                                {showMismatchWarning && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontSize: '0.75rem', marginTop: '8px', background: '#fffbeb', padding: '6px 8px', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                                                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                                        <span>Collections mismatch by ₹{Math.abs(payMetrics.shortageExcess).toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div key={pump.id} className="card" style={{ borderLeft: '5px solid #0284c7' }}>
                                <h3 style={{ color: '#0369a1', marginBottom: '1rem', fontSize: '1.2rem' }}>{pump.name}</h3>
                                {renderFuelSection('Petrol')}
                                {renderFuelSection('Diesel')}
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
                {/* RIGHT COLUMN: Overall Sales Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h3 style={{ marginBottom: '1.25rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                            Overall Sales Summary
                        </h3>

                        {/* Pump Recorded UPI Sum Sub-section */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginBottom: '10px' }}>
                                Pump Recorded UPI Sum
                            </h4>
                            
                            {/* Manual UPI Inputs per Pump */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pumpsList.map(pump => (
                                    <div key={pump.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{pump.name} UPI:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '130px' }}>
                                            <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>₹</span>
                                            <input
                                                type="number"
                                                className="input"
                                                style={{
                                                    paddingLeft: '20px',
                                                    textAlign: 'right',
                                                    height: '34px',
                                                    fontSize: '0.85rem',
                                                    borderRadius: '6px'
                                                }}
                                                placeholder="0.00"
                                                value={pumpUpiInputs[pump.id] || ''}
                                                onChange={e => handleUpdatePumpUpi(pump.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Yesterday & Today Outstanding Credit Balances */}
                            <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '12px', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#64748b' }}>Yesterday Pending:</span>
                                    <span style={{ fontWeight: '700', color: '#ea580c' }}>
                                        ₹ {yesterdayPending.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#64748b' }}>Today Pending:</span>
                                    <span style={{ fontWeight: '700', color: '#ea580c' }}>
                                        ₹ {todayPending.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Total Settlement Calculation Section */}
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginBottom: '10px' }}>
                                Total Settlement Components
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Cash (Pump Entries):</span>
                                    <span style={{ fontWeight: '500' }}>₹ {totalCashCollected.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Card (Pump Entries):</span>
                                    <span style={{ fontWeight: '500' }}>₹ {totalCardCollected.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                                    <span>Pump UPI Total:</span>
                                    <span style={{ fontWeight: '500' }}>₹ {totalPumpUpi.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                                    <span>Total Settlement:</span>
                                    <span style={{ color: '#002F87' }}>₹ {totalSettlement.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actual Counted Input Field */}
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Actual Amount Counted:</span>
                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '130px' }}>
                                    <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>₹</span>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{
                                            paddingLeft: '20px',
                                            textAlign: 'right',
                                            height: '34px',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            borderRadius: '6px'
                                        }}
                                        placeholder="Enter Counted"
                                        value={actualAmountInput}
                                        onChange={e => setActualAmountInput(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reconciliation Difference Field */}
                        <div style={{
                            borderTop: '2px solid #334155',
                            paddingTop: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a' }}>Difference:</span>
                            <span style={{
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
                                color: settlement_difference >= 0 ? '#10b981' : '#ef4444'
                            }}>
                                ₹ {settlement_difference.toFixed(2)}
                            </span>
                        </div>

                        {/* Sales Volume Summary */}
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total Petrol Sold:</span>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>{totalPetrolLitres.toFixed(2)} L</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total Diesel Sold:</span>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>{totalDieselLitres.toFixed(2)} L</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#0f172a', fontWeight: 'bold', borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                                <span>Expected Sales Amount:</span>
                                <span style={{ color: '#0284c7' }}>₹ {totalSaleAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            onClick={handleCloseShift}
                        >
                            <Save size={18} />
                            <span>Save Daily Record</span>
                        </button>
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
