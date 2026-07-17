import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Service Role client (to bypass RLS if active)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get config from environment
    const provider = Deno.env.get('REMINDER_PROVIDER') ?? 'TWILIO'; // 'TWILIO' or 'MSG91'
    const channel = Deno.env.get('REMINDER_CHANNEL') ?? 'SMS'; // 'SMS' or 'WhatsApp'

    // 2. Fetch all customers
    const { data: customers, error: custErr } = await supabaseClient
      .from('customers')
      .select('id, name, phone, do_not_remind')
      .eq('do_not_remind', false);

    if (custErr) throw custErr;

    // 3. Fetch all credit transactions chronologically to calculate outstanding balance
    const { data: transactions, error: transErr } = await supabaseClient
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: true });

    if (transErr) throw transErr;

    // Compute balance for each customer
    const balanceMap = new Map();
    if (transactions) {
      transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        const type = t.type || 'Petrol Given';
        let currentBal = balanceMap.get(t.customer_id) || 0;

        if (type === 'Payment Received') {
          currentBal -= amt;
        } else {
          currentBal += amt;
          if (t.is_settled && !t.type) {
            currentBal -= amt; // Legacy settled auto-migration matching payment
          }
        }
        balanceMap.set(t.customer_id, currentBal);
      });
    }

    // Filter customers with balance > 0
    const pendingCustomers = (customers || []).filter(c => {
      const balance = balanceMap.get(c.id) || 0;
      return balance > 0 && c.phone;
    });

    const results = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const customer of pendingCustomers) {
      const balance = balanceMap.get(customer.id);
      
      // Check if a reminder was already sent today to this customer's phone
      const { data: existingLogs, error: logErr } = await supabaseClient
        .from('reminder_logs')
        .select('id')
        .eq('phone', customer.phone)
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`);

      if (logErr) {
        console.error(`Error checking logs for ${customer.name}:`, logErr);
        continue;
      }

      if (existingLogs && existingLogs.length > 0) {
        // Skip: already reminded today
        results.push({ customer: customer.name, status: 'Skipped (Already Sent Today)' });
        continue;
      }

      // Build message content
      const bunkName = "PPR & Sons (Indian Oil)";
      const dateStr = new Date().toLocaleDateString();
      const message = `Hi ${customer.name}, your pending balance at ${bunkName} is Rs. ${balance.toFixed(2)} as of ${dateStr}. Please settle at your earliest convenience. — ${bunkName}`;

      let sendStatus = 'Failed';
      let errorDetail = '';

      // 4. Send Message via API
      try {
        if (provider === 'TWILIO') {
          const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          let fromNumber = Deno.env.get('TWILIO_FROM_NUMBER'); // e.g. '+1234567890' or 'whatsapp:+14155238886'

          if (!accountSid || !authToken || !fromNumber) {
            throw new Error("Missing Twilio credentials in environment secrets.");
          }

          let toNumber = customer.phone;
          if (channel === 'WhatsApp') {
            if (!fromNumber.startsWith('whatsapp:')) fromNumber = `whatsapp:${fromNumber}`;
            if (!toNumber.startsWith('whatsapp:')) toNumber = `whatsapp:${toNumber}`;
          }

          const basicAuth = btoa(`${accountSid}:${authToken}`);
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: toNumber,
              From: fromNumber,
              Body: message,
            })
          });

          if (!response.ok) {
            const errRes = await response.text();
            throw new Error(`Twilio API error: ${errRes}`);
          }
          
          sendStatus = 'Success';

        } else if (provider === 'MSG91') {
          const authKey = Deno.env.get('MSG91_AUTH_KEY');
          const flowId = Deno.env.get('MSG91_FLOW_ID'); // template flow ID

          if (!authKey || !flowId) {
            throw new Error("Missing MSG91 credentials in environment secrets.");
          }

          // India MSG91 Flow Send
          const response = await fetch('https://api.msg91.com/api/v5/flow/', {
            method: 'POST',
            headers: {
              'authkey': authKey,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              flow_id: flowId,
              recipients: [
                {
                  mobiles: customer.phone.startsWith('+') ? customer.phone.substring(1) : customer.phone,
                  name: customer.name,
                  balance: balance.toFixed(2),
                  date: dateStr
                }
              ]
            })
          });

          const resJson = await response.json();
          if (resJson.type !== 'success') {
            throw new Error(`MSG91 API error: ${JSON.stringify(resJson)}`);
          }

          sendStatus = 'Success';
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }
      } catch (err) {
        errorDetail = err.message;
        console.error(`Failed to send reminder to ${customer.name}:`, err);
      }

      // 5. Log send status to database
      const { error: insertErr } = await supabaseClient
        .from('reminder_logs')
        .insert([{
          customer_name: customer.name,
          phone: customer.phone,
          amount: balance,
          channel: channel,
          status: sendStatus,
          error_detail: errorDetail || null
        }]);

      if (insertErr) {
        console.error(`Failed to write reminder log for ${customer.name}:`, insertErr);
      }

      results.push({ customer: customer.name, status: sendStatus, error: errorDetail || undefined });
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
