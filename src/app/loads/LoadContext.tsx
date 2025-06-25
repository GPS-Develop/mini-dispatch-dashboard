"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export type Load = {
  id: string;
  referenceId: string;
  pickupLocation: string;
  pickupDateTime: string;
  deliveryLocation: string;
  deliveryDateTime: string;
  loadType: string;
  temperature?: string;
  rate: string;
  driverId: string;
  notes?: string;
  brokerName: string;
  brokerContact: string;
  brokerEmail: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
  bolUrl?: string;
  podUrl?: string;
  driverUpdates?: Array<{
    timestamp: string;
    location?: string;
    temp?: string;
    eta?: string;
    note?: string;
  }>;
};

const defaultLoads: Load[] = [
  {
    id: "1001",
    referenceId: "L-1001",
    pickupLocation: "Dallas, TX",
    pickupDateTime: "2024-06-01T09:00",
    deliveryLocation: "Houston, TX",
    deliveryDateTime: "2024-06-01T17:00",
    loadType: "Reefer",
    temperature: "-5",
    rate: "$1200",
    driverId: "1",
    notes: "Urgent delivery.",
    brokerName: "Acme Logistics",
    brokerContact: "555-111-2222",
    brokerEmail: "broker@acme.com",
    status: "Scheduled",
    bolUrl: undefined,
    podUrl: undefined,
    driverUpdates: [],
  },
  {
    id: "1002",
    referenceId: "L-1002",
    pickupLocation: "Austin, TX",
    pickupDateTime: "2024-06-02T10:00",
    deliveryLocation: "San Antonio, TX",
    deliveryDateTime: "2024-06-02T15:00",
    loadType: "Dry Van",
    rate: "$900",
    driverId: "2",
    notes: "",
    brokerName: "Best Brokers",
    brokerContact: "555-333-4444",
    brokerEmail: "contact@bestbrokers.com",
    status: "In-Transit",
    bolUrl: undefined,
    podUrl: undefined,
    driverUpdates: [],
  },
];

const LoadContext = createContext<{
  loads: Load[];
  addLoad: (load: Omit<Load, "id">) => void;
  updateLoad: (id: string, load: Partial<Load>) => void;
  deleteLoad: (id: string) => void;
} | null>(null);

export function LoadProvider({ children }: { children: React.ReactNode }) {
  const [loads, setLoads] = useState<Load[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("loads");
    if (stored) setLoads(JSON.parse(stored));
    else setLoads(defaultLoads);
  }, []);

  useEffect(() => {
    localStorage.setItem("loads", JSON.stringify(loads));
  }, [loads]);

  function addLoad(load: Omit<Load, "id">) {
    setLoads((prev) => [
      { ...load, id: Date.now().toString() },
      ...prev,
    ]);
  }

  function updateLoad(id: string, load: Partial<Load>) {
    setLoads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...load } : l))
    );
  }

  function deleteLoad(id: string) {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <LoadContext.Provider value={{ loads, addLoad, updateLoad, deleteLoad }}>
      {children}
    </LoadContext.Provider>
  );
}

export function useLoads() {
  const ctx = useContext(LoadContext);
  if (!ctx) throw new Error("useLoads must be used within a LoadProvider");
  return ctx;
} 