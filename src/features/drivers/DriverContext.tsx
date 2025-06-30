"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useLoads } from "../loads/LoadContext";
import { supabase } from "../../utils/supabaseClient";

export type Driver = {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "On Load";
  payRate: string;
  driver_status: "active" | "inactive";
  scheduledLoads?: string[];
  inTransitLoads?: string[];
};

// Type for DB fields
export type DriverDB = {
  id?: string;
  name: string;
  phone: string;
  status: "Available" | "On Load";
  pay_rate: string;
  created_at?: string;
  driver_status?: "active" | "inactive";
};

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
  const { loads, loading: loadsLoading } = useLoads();
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Helper function to sort drivers: active first, then inactive
  const sortDrivers = (drivers: Driver[]) => {
    return drivers.sort((a, b) => {
      if (a.driver_status === "active" && b.driver_status === "inactive") return -1;
      if (a.driver_status === "inactive" && b.driver_status === "active") return 1;
      return 0;
    });
  };

  async function fetchDrivers() {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        setError(error.message);
        return;
      }
      const mappedDrivers = (data as DriverDB[]).map((d) => ({
        id: d.id!,
        name: d.name,
        phone: d.phone,
        status: d.status,
        payRate: d.pay_rate,
        driver_status: d.driver_status || "active",
      }));
      
      // Sort drivers: active first, then inactive
      const sortedDrivers = mappedDrivers.sort((a, b) => {
        if (a.driver_status === "active" && b.driver_status === "inactive") return -1;
        if (a.driver_status === "inactive" && b.driver_status === "active") return 1;
        // If same status, sort by creation date (newest first)
        return 0;
      });
      
      setDrivers(sortedDrivers);
      setHasInitiallyLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
    setLoading(false);
    }
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Automatically update driver status and load lists based on assigned loads
  useEffect(() => {
    // Only update driver status if both contexts have finished their initial loading
    if (!loadsLoading && hasInitiallyLoaded && drivers.length > 0) {
    setDrivers((prevDrivers) =>
        sortDrivers(prevDrivers.map((driver) => {
        const scheduledLoads = loads
          .filter((l) => l.driver_id === driver.id && l.status === "Scheduled")
          .map((l) => l.reference_id);
        const inTransitLoads = loads
          .filter((l) => l.driver_id === driver.id && l.status === "In-Transit")
          .map((l) => l.reference_id);
        const status = (scheduledLoads.length > 0 || inTransitLoads.length > 0) ? "On Load" : "Available";
        return {
          ...driver,
          status,
          scheduledLoads,
          inTransitLoads,
        };
        }))
    );
    }
  }, [loads, loadsLoading, hasInitiallyLoaded]);

  async function addDriver(driver: DriverDB) {
    setError(null);
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
        const newDriver: Driver = {
          id: data.id,
          name: data.name,
          phone: data.phone,
          status: data.status,
          payRate: data.pay_rate,
          driver_status: data.driver_status || "active",
        };
        
        setDrivers(prev => sortDrivers([newDriver, ...prev]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add driver');
    }
  }

  async function updateDriver(id: string, driver: Partial<DriverDB>) {
    setError(null);
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
        setDrivers(prev => sortDrivers(prev.map(d => 
          d.id === id 
            ? {
                ...d,
                name: data.name,
                phone: data.phone,
                status: data.status,
                payRate: data.pay_rate,
                driver_status: data.driver_status || "active",
              }
            : d
        )));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update driver');
    }
  }

  async function deleteDriver(id: string) {
    setError(null);
    try {
      // Check if driver is currently assigned to any active loads
      const activeLoads = loads.filter(load => 
        load.driver_id === id && 
        (load.status === "Scheduled" || load.status === "In-Transit")
      );
      
      if (activeLoads.length > 0) {
        const loadReferences = activeLoads.map(load => `#${load.reference_id}`).join(", ");
        throw new Error(`Driver is currently on load(s): ${loadReferences}. Please mark the load(s) as delivered before deactivating the driver.`);
      }
      
      // Check if driver has any delivered loads that need driver_id cleared
      const deliveredLoads = loads.filter(load => 
        load.driver_id === id && 
        load.status === "Delivered"
      );
      
      if (deliveredLoads.length > 0) {
        // Clear driver_id from delivered loads to remove foreign key constraint
        const { error: updateError } = await supabase
          .from("loads")
          .update({ driver_id: null })
          .eq("driver_id", id)
          .eq("status", "Delivered");
        
        if (updateError) {
          setError(`Failed to clear driver from delivered loads: ${updateError.message}`);
          return;
        }
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