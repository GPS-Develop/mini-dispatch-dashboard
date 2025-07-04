"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";
import { validateRate, validateTemperature } from "../../utils/validation";

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
  temperature?: number | null;
  rate: number;
  driver_id: string;
  notes?: string;
  broker_name: string;
  broker_contact: number;
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
  const supabase = createClient();

  async function fetchLoads() {
    setLoading(true);
    setError(null);
    try {
    const { data, error } = await supabase
      .from("loads")
      .select("*")
      .order("created_at", { ascending: false });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // Convert broker_contact to number if it comes as string from database
      const mappedLoads = (data || []).map((load: any) => ({
        ...load,
        broker_contact: typeof load.broker_contact === 'string' ? 
          parseInt(load.broker_contact) || 0 : 
          load.broker_contact
      }));
      setLoads(mappedLoads as Load[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
    setLoading(false);
    }
  }

  useEffect(() => {
    fetchLoads();
  }, []);

  async function addLoad(load: Record<string, any>) {
    setError(null);
    
    // Validate rate before sending to database
    if (load.rate) {
      const rateValidation = validateRate(load.rate);
      if (!rateValidation.isValid) {
        setError(rateValidation.error || 'Invalid rate');
        return;
      }
      // Use sanitized value
      load.rate = rateValidation.sanitizedValue;
    }
    
    try {
      const { data, error } = await supabase
        .from("loads")
        .insert([{ ...load }])
        .select()
        .single();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data) {
        // Convert broker_contact to number if needed
        const mappedLoad = {
          ...data,
          broker_contact: typeof data.broker_contact === 'string' ? 
            parseInt(data.broker_contact) || 0 : 
            data.broker_contact
        };
        setLoads(prev => [mappedLoad as Load, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add load');
    }
  }

  async function updateLoad(id: string, load: Record<string, any>) {
    setError(null);
    
    // Validate rate before sending to database
    if (load.rate) {
      const rateValidation = validateRate(load.rate);
      if (!rateValidation.isValid) {
        setError(rateValidation.error || 'Invalid rate');
        return;
      }
      // Use sanitized value
      load.rate = rateValidation.sanitizedValue;
    }
    
    try {
      const { data, error } = await supabase
        .from("loads")
        .update(load)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data) {
        // Convert broker_contact to number if needed
        const mappedLoad = {
          ...data,
          broker_contact: typeof data.broker_contact === 'string' ? 
            parseInt(data.broker_contact) || 0 : 
            data.broker_contact
        };
        setLoads(prev => prev.map(l => 
          l.id === id ? mappedLoad as Load : l
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update load');
    }
  }

  async function deleteLoad(id: string) {
    setError(null);
    try {
      // With CASCADE delete, we only need to delete the load
      // All related pickups, deliveries, and documents will be automatically deleted
      const { error } = await supabase
        .from("loads")
        .delete()
        .eq("id", id);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      setLoads(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete load');
    }
  }

  async function addFullLoad(load: Record<string, any>, pickups: any[], deliveries: any[]) {
    setError(null);
    
    // Validate rate before sending to database
    if (load.rate) {
      const rateValidation = validateRate(load.rate);
      if (!rateValidation.isValid) {
        setError(rateValidation.error || 'Invalid rate');
        return;
      }
      // Use sanitized value
      load.rate = rateValidation.sanitizedValue;
    }
    
    try {
    // 1. Insert the load
      const { data, error: loadError } = await supabase
        .from("loads")
        .insert([{ ...load }])
        .select()
        .single();
      
      if (loadError || !data) {
      setError(loadError?.message || "Failed to create load");
      return;
    }
      
      const loadId = data.id;
      
    // 2. Insert pickups
    for (const p of pickups) {
      const { error: pickupError } = await supabase.from("pickups").insert([
        {
          load_id: loadId,
          address: p.address,
          city: p.city,
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
          city: d.city,
          state: d.state,
          datetime: d.datetime,
        }
      ]);
      if (deliveryError) {
        setError(deliveryError.message);
        return;
      }
    }
      
      // Add the new load to the state with broker_contact converted to number
      const mappedLoad = {
        ...data,
        broker_contact: typeof data.broker_contact === 'string' ? 
          parseInt(data.broker_contact) || 0 : 
          data.broker_contact
      };
      setLoads(prev => [mappedLoad as Load, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add full load');
    }
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