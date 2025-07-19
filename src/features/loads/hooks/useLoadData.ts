"use client";
import { useState, useEffect, useCallback } from 'react';
import { useLoads } from '../LoadContext';
import { createClient } from '../../../utils/supabase/client';
import { Pickup, Delivery, LumperService } from '../../../types';

export function useLoadData() {
  const { loads } = useLoads();
  const [pickupsMap, setPickupsMap] = useState<Record<string, Pickup[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [lumperMap, setLumperMap] = useState<Record<string, LumperService>>({});
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchAllPickupsDeliveries = useCallback(async () => {
    if (loads.length === 0) return;
    try {
      const loadIds = loads.map(l => l.id);
      const { data: pickups, error: pickupsError } = await supabase.from("pickups").select("*").in("load_id", loadIds);
      const { data: deliveries, error: deliveriesError } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
      const { data: lumperServices, error: lumperError } = await supabase.from("lumper_services").select("*").in("load_id", loadIds);
      
      if (pickupsError || deliveriesError || lumperError) {
        setError(pickupsError?.message || deliveriesError?.message || lumperError?.message || 'Failed to fetch load data');
        return;
      }
      
      const pickupsByLoad: Record<string, Pickup[]> = {};
      const deliveriesByLoad: Record<string, Delivery[]> = {};
      const lumperByLoad: Record<string, LumperService> = {};
      
      pickups?.forEach(p => {
        if (!pickupsByLoad[p.load_id]) pickupsByLoad[p.load_id] = [];
        pickupsByLoad[p.load_id].push(p);
      });
      deliveries?.forEach(d => {
        if (!deliveriesByLoad[d.load_id]) deliveriesByLoad[d.load_id] = [];
        deliveriesByLoad[d.load_id].push(d);
      });
      lumperServices?.forEach(l => {
        lumperByLoad[l.load_id] = l;
      });
      
      setPickupsMap(pickupsByLoad);
      setDeliveriesMap(deliveriesByLoad);
      setLumperMap(lumperByLoad);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch load data');
    }
  }, [loads, supabase]);

  useEffect(() => {
    fetchAllPickupsDeliveries();
  }, [loads, fetchAllPickupsDeliveries]);

  return {
    pickupsMap,
    deliveriesMap,
    lumperMap,
    error,
    setError,
    fetchAllPickupsDeliveries
  };
}