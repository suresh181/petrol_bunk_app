
// Mock Prices
const prices = { petrol: 100, diesel: 90 };

// 1. General Shift Logic
function calculateGeneral(opening, closing, test_taken, test_returned, cash) {
    const litres = Math.max(0, closing - opening);
    const sale_amount = litres * prices.petrol;
    const short_excess = sale_amount - cash;
    const test_net = test_taken - test_returned;
    return { litres, sale_amount, short_excess, test_net };
}

// 2. Diesel Logic
function calculateDiesel(opening, closing, test_taken, test_returned, cash) {
    const litres = Math.max(0, closing - opening);
    const sale_amount = litres * prices.diesel;
    const short_excess = sale_amount - cash;
    const test_net = test_taken - test_returned;
    return { litres, sale_amount, short_excess, test_net };
}

// 3. Settlement Logic
function calculateSettlement(short_gen, short_night, short_diesel, yesterday_pending, today_pending_input, today_settlement) {
    const total_calc = short_gen + short_night + short_diesel + yesterday_pending - today_pending_input;
    const difference = today_settlement - total_calc;
    return { total_calc, difference };
}

// Run Tests
console.log("--- VERIFICATION RESULTS ---");

// Test 1: General Shift Normal
const t1 = calculateGeneral(1000, 1100, 0, 0, 10000); // 100L * 100 = 10000. Cash 10000.
console.log("Test 1 (Normal):", t1.litres === 100 && t1.sale_amount === 10000 && t1.short_excess === 0 ? "PASS" : "FAIL", t1);

// Test 2: General Shift with Test Sample
const t2 = calculateGeneral(1000, 1100, 5, 5, 10000); // 100L. Test 5/5. Net 0.
// Litres should be 100. Sale 10000.
console.log("Test 2 (Test Sample Net 0):", t2.litres === 100 && t2.sale_amount === 10000 ? "PASS" : "FAIL", t2);

// Test 3: Diesel Logic
const t3 = calculateDiesel(2000, 2100, 5, 0, 9000); // 100L * 90 = 9000.
console.log("Test 3 (Diesel Normal):", t3.litres === 100 && t3.sale_amount === 9000 ? "PASS" : "FAIL", t3);

// Test 4: Settlement Logic
// Shortages: Gen=0, Night=0 (assume), Diesel=0.
// Yesterday=100. Today Pending Input=50.
// Total = 0 + 0 + 0 + 100 - 50 = 50.
// Settlement = 50. Diff should be 0.
const t4 = calculateSettlement(0, 0, 0, 100, 50, 50);
console.log("Test 4 (Settlement Exact):", t4.total_calc === 50 && t4.difference === 0 ? "PASS" : "FAIL", t4);

// Test 5: Settlement with Deficit
// Shortage=100. Yesterday=0. TodayInput=0.
// Total = 100. Settlement=80. Diff = 80 - 100 = -20.
const t5 = calculateSettlement(100, 0, 0, 0, 0, 80);
console.log("Test 5 (Settlement Short):", t5.total_calc === 100 && t5.difference === -20 ? "PASS" : "FAIL", t5);

