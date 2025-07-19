"use client";
import React, { createContext, useContext } from "react";
import { LoadProvider, useLoads } from "../features/loads/LoadContext";
import { DriverProvider, useDrivers } from "../features/drivers/DriverContext";
import { useDriverStatus } from "../hooks/useDriverStatus";

interface AppDataContextType {
  loads: ReturnType<typeof useLoads>['loads'];
  drivers: ReturnType<typeof useDrivers>['drivers'];
  driversWithStatus: ReturnType<typeof useDriverStatus>['driversWithStatus'];
  loadActions: Omit<ReturnType<typeof useLoads>, 'loads'>;
  driverActions: Omit<ReturnType<typeof useDrivers>, 'drivers'>;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

function AppDataProviderContent({ children }: { children: React.ReactNode }) {
  const loadContext = useLoads();
  const driverContext = useDrivers();
  const { driversWithStatus } = useDriverStatus(driverContext.drivers, loadContext.loads);

  const value: AppDataContextType = {
    loads: loadContext.loads,
    drivers: driverContext.drivers,
    driversWithStatus,
    loadActions: {
      addLoad: loadContext.addLoad,
      updateLoad: loadContext.updateLoad,
      deleteLoad: loadContext.deleteLoad,
      loading: loadContext.loading,
      error: loadContext.error,
      fetchLoads: loadContext.fetchLoads,
      addFullLoad: loadContext.addFullLoad,
    },
    driverActions: {
      addDriver: driverContext.addDriver,
      updateDriver: driverContext.updateDriver,
      deleteDriver: driverContext.deleteDriver,
      reactivateDriver: driverContext.reactivateDriver,
      loading: driverContext.loading,
      error: driverContext.error,
    },
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  return (
    <LoadProvider>
      <DriverProvider>
        <AppDataProviderContent>
          {children}
        </AppDataProviderContent>
      </DriverProvider>
    </LoadProvider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}