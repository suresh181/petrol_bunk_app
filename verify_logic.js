// verify_logic.js

const currentPrice = 102.50;
const customerDiscount = 2.0; // 2%
const liters = 10;

console.log(`--- Testing Credit Calculation ---`);
console.log(`Fuel Price: ₹${currentPrice}`);
console.log(`Customer Discount: ${customerDiscount}%`);
console.log(`Liters: ${liters}L`);

// Logic from ShiftSales.jsx
const discountAmount = (currentPrice * customerDiscount) / 100;
const discountedPrice = currentPrice - discountAmount;
const billAmount = liters * discountedPrice;

console.log(`\n--- Results ---`);
console.log(`Discount Amount per Liter: ₹${discountAmount.toFixed(2)}`);
console.log(`Discounted Rate: ₹${discountedPrice.toFixed(2)}`);
console.log(`Total Bill Amount: ₹${billAmount.toFixed(2)}`);

// Expected
const expected = 10 * (102.50 - (102.50 * 0.02));
console.log(`\nExpected: ₹${expected.toFixed(2)}`);

if (billAmount.toFixed(2) === expected.toFixed(2)) {
    console.log("SUCCESS: Logic is correct.");
} else {
    console.log("FAILURE: Logic mismatch.");
}
