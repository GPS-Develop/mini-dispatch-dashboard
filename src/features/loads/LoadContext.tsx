"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "../../utils/supabase/client";
import { validateRate } from "../../utils/validation";
import { convertDatabaseLoadToFrontend, FrontendLoad } from "../../utils/typeConversions";

export type Load = FrontendLoad & {
  drivers?: {
    id: string;
    name: string;
    phone: number;
    email?: string;
    status: "Available" | "On Load";
    pay_rate: number;
    driver_status: "active" | "inactive";
  };
};

const LoadContext = createContext<{
  loads: Load[];
  addLoad: (load: Record<string, unknown>) => Promise<void>;
  updateLoad: (id: string, load: Record<string, unknown>) => Promise<void>;
  deleteLoad: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  fetchLoads: () => Promise<void>;
  addFullLoad: (load: Record<string, unknown>, pickups: Array<{ name: string; address: string; city: string; state: string; postal_code: string; datetime: string }>, deliveries: Array<{ name: string; address: string; city: string; state: string; postal_code: string; datetime: string }>) => Promise<void>;
} | null>(null);

export function LoadProvider({ children }: { children: React.ReactNode }) {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
    const { data, error } = await supabase
      .from("loads")
      .select(`
        *,
        drivers!inner(id, name, phone, email, status, pay_rate, driver_status)
      `)
      .order("created_at", { ascending: false });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // Convert database loads to frontend format
      const mappedLoads = (data || []).map(load => convertDatabaseLoadToFrontend(load));
      setLoads(mappedLoads as Load[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
    setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  async function addLoad(load: Record<string, unknown>) {
    setError(null);
    
    // Validate rate before sending to database
    if (load.rate !== undefined && load.rate !== null) {
      const rateValidation = validateRate(load.rate as string | number);
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
        // Convert database load to frontend format
        const mappedLoad = convertDatabaseLoadToFrontend(data);
        setLoads(prev => [mappedLoad as Load, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add load');
    }
  }

  async function updateLoad(id: string, load: Record<string, unknown>) {
    setError(null);
    
    // Validate rate before sending to database
    if (load.rate !== undefined && load.rate !== null) {
      const rateValidation = validateRate(load.rate as string | number);
      if (!rateValidation.isValid) {
        setError(rateValidation.error || 'Invalid rate');
        return;
      }
      // Use sanitized value
      load.rate = rateValidation.sanitizedValue;
    }
    
    try {
      // Get the current load to check if status is changing
      const currentLoad = loads.find(l => l.id === id);
      const isStatusChange = load.status && currentLoad && load.status !== currentLoad.status;
      
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
        // Convert database load to frontend format
        const mappedLoad = convertDatabaseLoadToFrontend(data);
        setLoads(prev => prev.map(l => 
          l.id === id ? mappedLoad as Load : l
        ));

        // Log status change activity if status was updated
        if (isStatusChange && data.status !== 'Scheduled') {
          try {
            // Get driver name for the activity
            const { data: driverData } = await supabase
              .from('drivers')
              .select('name')
              .eq('id', data.driver_id)
              .single();

            const driverName = driverData?.name || 'Unknown Driver';

            // Add status update activity
            await supabase.rpc('add_status_update_activity', {
              p_driver_name: driverName,
              p_load_reference_id: data.reference_id,
              p_new_status: data.status
            });
          } catch (activityError) {
            console.error('Failed to log status update activity:', activityError);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update load');
    }
  }

  async function deleteLoad(id: string) {
    setError(null);
    try {
      // First, get all documents associated with this load to delete from storage
      const { data: documents, error: documentsError } = await supabase
        .from('load_documents')
        .select('file_url')
        .eq('load_id', id);

      if (documentsError) {
        setError(documentsError.message);
        return;
      }

      // Delete all files from the load-pdfs bucket
      if (documents && documents.length > 0) {
        const filePaths = documents.map(doc => doc.file_url);
        const { error: storageError } = await supabase.storage
          .from('load-pdfs')
          .remove(filePaths);

        if (storageError) {
          console.warn('Failed to delete some files from storage:', storageError.message);
          // Continue with database deletion even if storage deletion fails
        }
      }

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

  async function addFullLoad(load: Record<string, unknown>, pickups: Array<{ name: string; address: string; city: string; state: string; postal_code: string; datetime: string }>, deliveries: Array<{ name: string; address: string; city: string; state: string; postal_code: string; datetime: string }>) {
    setError(null);
    
    // Validate rate before sending to database
    if (load.rate !== undefined && load.rate !== null) {
      const rateValidation = validateRate(load.rate as string | number);
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
          name: p.name,
          address: p.address,
          city: p.city,
          state: p.state,
          postal_code: p.postal_code,
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
          name: d.name,
          address: d.address,
          city: d.city,
          state: d.state,
          postal_code: d.postal_code,
          datetime: d.datetime,
        }
      ]);
      if (deliveryError) {
        setError(deliveryError.message);
        return;
      }
    }
      
      // Convert database load to frontend format and add to state
      const mappedLoad = convertDatabaseLoadToFrontend(data);
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