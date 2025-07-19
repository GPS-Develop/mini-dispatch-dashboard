"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "../../utils/supabase/client";
import { validateDriverPayRate } from "../../utils/validation";
import { convertDatabaseDriverToFrontend, FrontendDriver, DatabaseDriver } from "../../utils/typeConversions";

export type Driver = FrontendDriver;
export type DriverDB = Partial<DatabaseDriver>;

const DriverContext = createContext<{
  drivers: Driver[];
  addDriver: (driver: DriverDB) => Promise<void>;
  updateDriver: (id: string, driver: Partial<DriverDB>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  reactivateDriver: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
} | null>(null);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Helper function to sort drivers: active first, then inactive
  const sortDrivers = (drivers: Driver[]) => {
    return drivers.sort((a, b) => {
      if (a.driver_status === "active" && b.driver_status === "inactive") return -1;
      if (a.driver_status === "inactive" && b.driver_status === "active") return 1;
      return 0;
    });
  };

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        setError(error.message);
        return;
      }
      const mappedDrivers = (data as DatabaseDriver[]).map(convertDatabaseDriverToFrontend);
      
      // Sort drivers: active first, then inactive
      const sortedDrivers = mappedDrivers.sort((a, b) => {
        if (a.driver_status === "active" && b.driver_status === "inactive") return -1;
        if (a.driver_status === "inactive" && b.driver_status === "active") return 1;
        // If same status, sort by creation date (newest first)
        return 0;
      });
      
      setDrivers(sortedDrivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
    setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);


  async function addDriver(driver: DriverDB) {
    setError(null);
    
    // Validate pay rate before sending to database
    if (driver.pay_rate) {
      const rateValidation = validateDriverPayRate(driver.pay_rate);
      if (!rateValidation.isValid) {
        setError(rateValidation.error || 'Invalid pay rate');
        return;
      }
      // Use sanitized value
      driver.pay_rate = rateValidation.sanitizedValue;
    }
    
    try {
      const { data, error } = await supabase
        .from("drivers")
        .insert([{ ...driver }])
        .select()
        .single();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data) {
        const newDriver = convertDatabaseDriverToFrontend(data as DatabaseDriver);
        setDrivers(prev => sortDrivers([newDriver, ...prev]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add driver');
    }
  }

  async function updateDriver(id: string, driver: Partial<DriverDB>) {
    setError(null);
    
    // Validate pay rate before sending to database
    if (driver.pay_rate) {
      const rateValidation = validateDriverPayRate(driver.pay_rate);
      if (!rateValidation.isValid) {
        setError(rateValidation.error || 'Invalid pay rate');
        return;
      }
      // Use sanitized value
      driver.pay_rate = rateValidation.sanitizedValue;
    }
    
    try {
      const { data, error } = await supabase
        .from("drivers")
        .update(driver)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data) {
        const updatedDriver = convertDatabaseDriverToFrontend(data as DatabaseDriver);
        setDrivers(prev => sortDrivers(prev.map(d => 
          d.id === id ? { ...d, ...updatedDriver } : d
        )));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update driver');
    }
  }

  async function deleteDriver(id: string) {
    setError(null);
    try {
      // Check if driver is currently assigned to any active loads by querying the database
      const { data: activeLoads, error: loadCheckError } = await supabase
        .from('loads')
        .select('reference_id')
        .eq('driver_id', id)
        .in('status', ['Scheduled', 'In-Transit']);
      
      if (loadCheckError) {
        throw new Error(`Failed to check driver loads: ${loadCheckError.message}`);
      }
      
      if (activeLoads && activeLoads.length > 0) {
        const loadReferences = activeLoads.map(load => `#${load.reference_id}`).join(", ");
        throw new Error(`Driver is currently on load(s): ${loadReferences}. Please mark the load(s) as delivered before deactivating the driver.`);
      }
      
      // Soft delete: set driver_status to 'inactive'
      const { error } = await supabase
        .from("drivers")
        .update({ driver_status: "inactive" })
        .eq("id", id);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // Update local state optimistically - change status to inactive instead of removing
      setDrivers(prev => sortDrivers(prev.map(d => 
        d.id === id 
          ? { ...d, driver_status: "inactive" as const }
          : d
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate driver');
    }
  }

  async function reactivateDriver(id: string) {
    setError(null);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ driver_status: "active" })
        .eq("id", id);
      if (error) {
        setError(error.message);
        return;
      }
      
      // Update local state optimistically
      setDrivers(prev => sortDrivers(prev.map(d => 
        d.id === id 
          ? { ...d, driver_status: "active" as const }
          : d
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate driver');
    }
  }

  return (
    <DriverContext.Provider value={{ drivers, addDriver, updateDriver, deleteDriver, reactivateDriver, loading, error }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDrivers() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDrivers must be used within a DriverProvider");
  return ctx;
} 