"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { PayStatement, PayStatementDB, TripSummary } from "../../types";

const PayStatementContext = createContext<{
  payStatements: PayStatement[];
  addPayStatement: (payStatement: PayStatementDB) => Promise<void>;
  updatePayStatement: (id: string, payStatement: Partial<PayStatementDB>) => Promise<void>;
  deletePayStatement: (id: string) => Promise<void>;
  calculateGrossPay: (driverId: string, periodStart: string, periodEnd: string) => Promise<{ grossPay: number; trips: TripSummary[] }>;
  loading: boolean;
  error: string | null;
} | null>(null);

export function PayStatementProvider({ children }: { children: React.ReactNode }) {
  const [payStatements, setPayStatements] = useState<PayStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPayStatements() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("pay_statements")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      const mappedPayStatements = (data as PayStatementDB[]).map((ps) => ({
        id: ps.id!,
        driver_id: ps.driver_id,
        period_start: ps.period_start,
        period_end: ps.period_end,
        gross_pay: ps.gross_pay,
        additions: ps.additions || {},
        deductions: ps.deductions || {},
        notes: ps.notes,
        created_at: ps.created_at!,
      }));
      
      setPayStatements(mappedPayStatements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayStatements();
  }, []);

  async function calculateGrossPay(driverId: string, periodStart: string, periodEnd: string): Promise<{ grossPay: number; trips: TripSummary[] }> {
    try {
      // Get all delivered loads for the driver in the period
      const { data: loads, error: loadsError } = await supabase
        .from("loads")
        .select(`
          id,
          reference_id,
          rate,
          status,
          pickups!inner(datetime, address, state),
          deliveries!inner(datetime, address, state)
        `)
        .eq("driver_id", driverId)
        .eq("status", "Delivered");

      if (loadsError) {
        throw new Error(`Failed to fetch loads: ${loadsError.message}`);
      }

      // Filter loads by period based on pickup date
      const filteredLoads = loads?.filter((load: any) => {
        const pickupDate = new Date(load.pickups[0]?.datetime);
        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);
        return pickupDate >= startDate && pickupDate <= endDate;
      }) || [];

      // Calculate gross pay and create trip summaries
      let grossPay = 0;
      const trips: TripSummary[] = [];

      filteredLoads.forEach((load: any) => {
        const rate = parseFloat(load.rate) || 0;
        grossPay += rate;

        // Extract city from address (take everything before the first comma)
        const fromCity = load.pickups[0]?.address?.split(',')[0] || load.pickups[0]?.address || '';
        const toCity = load.deliveries[0]?.address?.split(',')[0] || load.deliveries[0]?.address || '';

        trips.push({
          trip_number: load.reference_id,
          picked_date: load.pickups[0]?.datetime?.split('T')[0] || '',
          from_city: fromCity,
          drop_date: load.deliveries[0]?.datetime?.split('T')[0] || '',
          to_city: toCity,
          amount: rate,
        });
      });

      return { grossPay, trips };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to calculate gross pay');
    }
  }

  async function addPayStatement(payStatement: PayStatementDB) {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("pay_statements")
        .insert([{ ...payStatement }])
        .select()
        .single();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data) {
        const newPayStatement: PayStatement = {
          id: data.id,
          driver_id: data.driver_id,
          period_start: data.period_start,
          period_end: data.period_end,
          gross_pay: data.gross_pay,
          additions: data.additions || {},
          deductions: data.deductions || {},
          notes: data.notes,
          created_at: data.created_at,
        };
        
        setPayStatements(prev => [newPayStatement, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pay statement');
    }
  }

  async function updatePayStatement(id: string, payStatement: Partial<PayStatementDB>) {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("pay_statements")
        .update(payStatement)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data) {
        setPayStatements(prev => prev.map(ps => 
          ps.id === id 
            ? {
                ...ps,
                driver_id: data.driver_id,
                period_start: data.period_start,
                period_end: data.period_end,
                gross_pay: data.gross_pay,
                additions: data.additions || {},
                deductions: data.deductions || {},
                notes: data.notes,
              }
            : ps
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pay statement');
    }
  }

  async function deletePayStatement(id: string) {
    setError(null);
    try {
      const { error } = await supabase
        .from("pay_statements")
        .delete()
        .eq("id", id);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      setPayStatements(prev => prev.filter(ps => ps.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pay statement');
    }
  }

  return (
    <PayStatementContext.Provider value={{ 
      payStatements, 
      addPayStatement, 
      updatePayStatement, 
      deletePayStatement, 
      calculateGrossPay,
      loading, 
      error 
    }}>
      {children}
    </PayStatementContext.Provider>
  );
}

export function usePayStatements() {
  const ctx = useContext(PayStatementContext);
  if (!ctx) throw new Error("usePayStatements must be used within a PayStatementProvider");
  return ctx;
}
