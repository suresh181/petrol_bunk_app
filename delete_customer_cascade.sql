-- Create atomic cascade deletion function in Supabase database
create or replace function delete_customer_cascade(
    p_customer_id uuid,
    p_customer_name text,
    p_balance_to_settle numeric,
    p_notes text
) returns void as $$
begin
    -- 1. If balance > 0, log a settled payment in credit_transactions with null customer_id (system wide ledger reference)
    if p_balance_to_settle > 0 then
        insert into credit_transactions (
            customer_id,
            customer_name,
            amount,
            type,
            is_settled,
            created_at,
            notes
        ) values (
            null,
            p_customer_name,
            p_balance_to_settle,
            'Payment Received',
            true,
            now(),
            p_notes
        );
    end if;

    -- 2. Delete all ledger/transaction entries tied to this customer ID
    delete from credit_transactions
    where customer_id = p_customer_id::text;

    -- 3. Delete the customer record itself
    delete from customers
    where id = p_customer_id;
end;
$$ language plpgsql;
