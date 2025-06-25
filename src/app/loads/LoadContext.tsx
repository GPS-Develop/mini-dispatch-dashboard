"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";

export type Load = {
  id: string;
  reference_id: string;
  pickup_address: string;
  pickup_state: string;
  pickup_datetime: string;
  delivery_address: string;
  delivery_state: string;
  delivery_datetime: string;
  load_type: string;
  temperature?: string;
  rate: string;
  driver_id: string;
  notes?: string;
  broker_name: string;
  broker_contact: string;
  broker_email: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
};

const LoadContext = createContext<{
  loads: Load[];
  addLoad: (load: Record<string, any>) => Promise<void>;
  updateLoad: (id: string, load: Record<string, any>) => Promise<void>;
  deleteLoad: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
} | null>(null);

export function LoadProvider({ children }: { children: React.ReactNode }) {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLoads() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("loads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setLoads(data as Load[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchLoads();
  }, []);

  async function addLoad(load: Record<string, any>) {
    setError(null);
    const { error } = await supabase.from("loads").insert([{ ...load }]);
    if (error) setError(error.message);
    else await fetchLoads();
  }

  async function updateLoad(id: string, load: Record<string, any>) {
    setError(null);
    const { error } = await supabase.from("loads").update(load).eq("id", id);
    if (error) setError(error.message);
    else await fetchLoads();
  }

  async function deleteLoad(id: string) {
    setError(null);
    const { error } = await supabase.from("loads").delete().eq("id", id);
    if (error) setError(error.message);
    else await fetchLoads();
  }

  return (
    <LoadContext.Provider value={{ loads, addLoad, updateLoad, deleteLoad, loading, error }}>
      {children}
    </LoadContext.Provider>
  );
}

export function useLoads() {
  const ctx = useContext(LoadContext);
  if (!ctx) throw new Error("useLoads must be used within a LoadProvider");
  return ctx;
} 