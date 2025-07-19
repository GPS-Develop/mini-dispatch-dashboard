"use client";
import { useMemo } from 'react';
import { Load } from '../LoadContext';
import { Driver } from '../../drivers/DriverContext';
import { Pickup, Delivery, LumperService } from '../../../types';

interface UseLoadFilteringProps {
  loads: Load[];
  drivers: Driver[];
  pickupsMap: Record<string, Pickup[]>;
  deliveriesMap: Record<string, Delivery[]>;
  lumperMap: Record<string, LumperService>;
  statusFilter: string;
  driverFilter: string;
  search: string;
}

export function useLoadFiltering({
  loads,
  drivers,
  pickupsMap,
  deliveriesMap,
  lumperMap,
  statusFilter,
  driverFilter,
  search
}: UseLoadFilteringProps) {
  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      const lumperService = lumperMap[l.id];
      const matchesStatus = statusFilter === "All" || 
        (statusFilter === "Loads with Lumper" && lumperService && !lumperService.no_lumper) ||
        (statusFilter !== "Loads with Lumper" && l.status === statusFilter);
      
      const driver = drivers.find((d) => d.id === l.driver_id);
      const matchesDriver = !driverFilter || (driver && driver.name === driverFilter);
      
      const pickupSearch = (pickupsMap[l.id] || []).some(
        (p) =>
          (p.address || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.state || "").toLowerCase().includes(search.toLowerCase())
      );
      const deliverySearch = (deliveriesMap[l.id] || []).some(
        (d) =>
          (d.address || "").toLowerCase().includes(search.toLowerCase()) ||
          (d.city || "").toLowerCase().includes(search.toLowerCase()) ||
          (d.state || "").toLowerCase().includes(search.toLowerCase())
      );
      const matchesSearch =
        (l.reference_id || "").toLowerCase().includes(search.toLowerCase()) ||
        pickupSearch ||
        deliverySearch;
      
      return matchesStatus && matchesDriver && matchesSearch;
    });
  }, [loads, pickupsMap, deliveriesMap, lumperMap, statusFilter, driverFilter, search, drivers]);

  return { filteredLoads };
}