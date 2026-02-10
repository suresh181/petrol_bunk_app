
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');

console.log("Reading .env from:", envPath);
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.error("Could not read .env file:", e.message);
    process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) {
            env[key] = value;
        }
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    console.log("Keys found:", Object.keys(env));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCredits() {
    console.log("Fetching last 5 credit transactions...");
    const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
      *,
      customers ( name, phone )
    `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Found:", data.length);
    data.forEach((t, i) => {
        console.log(`[${i}] ID: ${t.id}`);
        console.log(`    Created At: ${t.created_at}`);
        console.log(`    Customer Name (Join):`, t.customers?.name);
        console.log(`    Customer Name (Raw):`, t.customer_name);
        console.log(`    Combined Search Term used by App:`, t.customers?.name || t.customer_name);
        console.log(`    Amount:`, t.amount);
        console.log(`    Is Settled:`, t.is_settled);
        console.log("--------------------------------");
    });
}

debugCredits();
