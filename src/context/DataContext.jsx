import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);

    // Default fallbacks in case DB is empty or loading
    const [prices, setPrices] = useState({ petrol: 102.50, diesel: 94.20, power: 108.00 });
    const [nozzles, setNozzles] = useState([]);
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        if (!supabase) {
            console.error("Supabase client not initialized. Check .env");
            setLoading(false);
            return;
        }

        // 1. Initial Fetch
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Prices
                const { data: priceData } = await supabase.from('fuel_prices').select('*').limit(1).single();
                if (priceData) {
                    setPrices({
                        id: priceData.id,
                        petrol: priceData.petrol,
                        diesel: priceData.diesel,
                        power: priceData.power,
                        petrol_profit: priceData.petrol_profit,
                        diesel_profit: priceData.diesel_profit,
                        petrol_stock: priceData.petrol_stock,
                        diesel_stock: priceData.diesel_stock
                    });
                }

                // Fetch Nozzles
                const { data: nozzleData } = await supabase.from('nozzles').select('*').order('id');
                if (nozzleData) {
                    // Map DB columns to our app structure if needed, or just use as is
                    // DB: id, product, reading, tank
                    // App expects: { id, product, flow: reading, tank, active: true }
                    setNozzles(nozzleData.map(n => ({ ...n, flow: n.reading })));
                }

                // Fetch Customers
                const { data: custData } = await supabase.from('customers').select('*').order('name');
                if (custData) {
                    // DB: id, name, vehicle, discount_percent
                    // App expects: { id, name, vehicle, discount: discount_percent }
                    setCustomers(custData.map(c => ({ ...c, discount: c.discount_percent })));
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // 2. Realtime Subscriptions
        const priceSub = supabase
            .channel('prices')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_prices' }, (payload) => {
                if (payload.new) {
                    setPrices(prev => ({
                        ...prev,
                        petrol: payload.new.petrol,
                        diesel: payload.new.diesel,
                        power: payload.new.power,
                        petrol_profit: payload.new.petrol_profit,
                        diesel_profit: payload.new.diesel_profit,
                        petrol_stock: payload.new.petrol_stock,
                        diesel_stock: payload.new.diesel_stock
                    }));
                }
            })
            .subscribe();

        const nozzleSub = supabase
            .channel('nozzles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'nozzles' }, () => {
                // Simple strategy: Refetch on any change to avoid complex merge logic for now
                // Or we can manually merge specific events
                fetchData();
            })
            .subscribe();

        const customerSub = supabase
            .channel('customers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
                // Re-fetch strictly for consistency or optimistic update
                // Let's re-fetch to keep it robust
                setTimeout(fetchData, 500);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(priceSub);
            supabase.removeChannel(nozzleSub);
            supabase.removeChannel(customerSub);
        };
    }, []);

    return (
        <DataContext.Provider value={{ prices, setPrices, nozzles, setNozzles, customers, setCustomers, loading }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
