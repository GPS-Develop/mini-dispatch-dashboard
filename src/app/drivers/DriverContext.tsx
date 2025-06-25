"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useLoads } from "../loads/LoadContext";

export type Driver = {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "On Load";
  payRate: string;
  scheduledLoads?: string[];
  inTransitLoads?: string[];
};

const defaultDrivers: Driver[] = [
  {
    id: "1",
    name: "John Smith",
    phone: "555-123-4567",
    status: "Available",
    payRate: "$0.60/mi",
    scheduledLoads: [],
    inTransitLoads: [],
  },
  {
    id: "2",
    name: "Maria Lopez",
    phone: "555-987-6543",
    status: "Available",
    payRate: "$0.65/mi",
    scheduledLoads: [],
    inTransitLoads: [],
  },
  {
    id: "3",
    name: "Ali Khan",
    phone: "555-555-5555",
    status: "Available",
    payRate: "$0.62/mi",
    scheduledLoads: [],
    inTransitLoads: [],
  },
];

const DriverContext = createContext<{
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, "id" | "scheduledLoads" | "inTransitLoads">) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
} | null>(null);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const { loads } = useLoads();

  useEffect(() => {
    const stored = localStorage.getItem("drivers");
    if (stored) setDrivers(JSON.parse(stored));
    else setDrivers(defaultDrivers);
  }, []);

  useEffect(() => {
    localStorage.setItem("drivers", JSON.stringify(drivers));
  }, [drivers]);

  // Automatically update driver status and load lists based on assigned loads
  useEffect(() => {
    setDrivers((prevDrivers) =>
      prevDrivers.map((driver) => {
        const scheduledLoads = loads
          .filter((l) => l.driverId === driver.id && l.status === "Scheduled")
          .map((l) => l.referenceId);
        const inTransitLoads = loads
          .filter((l) => l.driverId === driver.id && l.status === "In-Transit")
          .map((l) => l.referenceId);
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

  function addDriver(driver: Omit<Driver, "id" | "scheduledLoads" | "inTransitLoads">) {
    setDrivers((prev) => [
      { ...driver, id: Date.now().toString(), scheduledLoads: [], inTransitLoads: [] },
      ...prev,
    ]);
  }

  function updateDriver(id: string, driver: Partial<Driver>) {
    setDrivers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...driver } : d))
    );
  }

  function deleteDriver(id: string) {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <DriverContext.Provider value={{ drivers, addDriver, updateDriver, deleteDriver }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDrivers() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDrivers must be used within a DriverProvider");
  return ctx;
} 