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
};

const DriverContext = createContext<{
  drivers: Driver[];
  addDriver: (driver: DriverDB) => Promise<void>;
  updateDriver: (id: string, driver: Partial<DriverDB>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
} | null>(null);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loads } = useLoads();

  async function fetchDrivers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setDrivers(
      (data as DriverDB[]).map((d) => ({
        id: d.id!,
        name: d.name,
        phone: d.phone,
        status: d.status,
        payRate: d.pay_rate,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Automatically update driver status and load lists based on assigned loads
  useEffect(() => {
    setDrivers((prevDrivers) =>
      prevDrivers.map((driver) => {
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
      })
    );
  }, [loads]);

  async function addDriver(driver: DriverDB) {
    setError(null);
    const { error } = await supabase.from("drivers").insert([{ ...driver }]);
    if (error) setError(error.message);
    else await fetchDrivers();
  }

  async function updateDriver(id: string, driver: Partial<DriverDB>) {
    setError(null);
    const { error } = await supabase.from("drivers").update(driver).eq("id", id);
    if (error) setError(error.message);
    else await fetchDrivers();
  }

  async function deleteDriver(id: string) {
    setError(null);
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) setError(error.message);
    else await fetchDrivers();
  }

  return (
    <DriverContext.Provider value={{ drivers, addDriver, updateDriver, deleteDriver, loading, error }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDrivers() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDrivers must be used within a DriverProvider");
  return ctx;
} 