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
  fetchLoads: () => Promise<void>;
  addFullLoad: (load: Record<string, any>, pickups: any[], deliveries: any[]) => Promise<void>;
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

  async function addFullLoad(load: Record<string, any>, pickups: any[], deliveries: any[]) {
    setError(null);
    // 1. Insert the load
    const { data, error: loadError } = await supabase.from("loads").insert([{ ...load }]).select();
    if (loadError || !data || !data[0]) {
      setError(loadError?.message || "Failed to create load");
      return;
    }
    const loadId = data[0].id;
    // 2. Insert pickups
    for (const p of pickups) {
      const { error: pickupError } = await supabase.from("pickups").insert([
        {
          load_id: loadId,
          address: p.address,
          state: p.state,
          datetime: p.datetime,
        }
      ]);
      if (pickupError) {
        setError(pickupError.message);
        return;
      }
    }
    // 3. Insert deliveries
    for (const d of deliveries) {
      const { error: deliveryError } = await supabase.from("deliveries").insert([
        {
          load_id: loadId,
          address: d.address,
          state: d.state,
          datetime: d.datetime,
        }
      ]);
      if (deliveryError) {
        setError(deliveryError.message);
        return;
      }
    }
    await fetchLoads();
  }

  return (
    <LoadContext.Provider value={{ loads, addLoad, updateLoad, deleteLoad, loading, error, fetchLoads, addFullLoad }}>
      {children}
    </LoadContext.Provider>
  );
}

export function useLoads() {
  const ctx = useContext(LoadContext);
  if (!ctx) throw new Error("useLoads must be used within a LoadProvider");
  return ctx;
} 