"use client";
import { useMemo } from 'react';
import { Driver } from '../features/drivers/DriverContext';
import { Load } from '../features/loads/LoadContext';

export function useDriverStatus(drivers: Driver[], loads: Load[]) {
  const driversWithStatus = useMemo(() => {
    // Pre-compute load mappings to avoid N+1 filtering
    const loadsByDriverId = loads.reduce((acc, load) => {
      if (!acc[load.driver_id]) {
        acc[load.driver_id] = { scheduled: [], inTransit: [] };
      }
      if (load.status === "Scheduled") {
        acc[load.driver_id].scheduled.push(load.reference_id);
      } else if (load.status === "In-Transit") {
        acc[load.driver_id].inTransit.push(load.reference_id);
      }
      return acc;
    }, {} as Record<string, { scheduled: string[]; inTransit: string[] }>);

    return drivers.map((driver) => {
      const driverLoads = loadsByDriverId[driver.id] || { scheduled: [], inTransit: [] };
      const status: "Available" | "On Load" = (driverLoads.scheduled.length > 0 || driverLoads.inTransit.length > 0) ? "On Load" : "Available";
      return {
        ...driver,
        status,
        scheduledLoads: driverLoads.scheduled,
        inTransitLoads: driverLoads.inTransit,
      };
    });
  }, [drivers, loads]);

  return { driversWithStatus };
}