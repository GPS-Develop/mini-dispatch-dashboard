"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLoads } from "./loads/LoadContext";
import { useDrivers } from "./drivers/DriverContext";

export default function Home() {
  const { loads } = useLoads();
  const { drivers } = useDrivers();
  const upcomingLoads = loads
    .filter((load) => load.status === "Scheduled")
    .sort((a, b) => new Date(a.pickup_datetime).getTime() - new Date(b.pickup_datetime).getTime());

  const recentActivity = [
    "Driver A submitted Reefer temp: -5°C",
    "ETA updated",
    "POD uploaded",
  ];

  function getDriverName(driver_id: string) {
    const driver = drivers.find((d) => d.id === driver_id);
    return driver ? driver.name : driver_id;
  }

  return (
    <>
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upcoming Loads */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Upcoming Loads</h2>
            <div className="flex flex-col gap-4">
              {upcomingLoads.length === 0 ? (
                <div className="text-gray-500">No upcoming loads.</div>
              ) : (
                upcomingLoads.map((load, idx) => (
                  <div
                    key={load.id}
                    className="rounded border bg-white p-4 shadow-sm"
                  >
                    <div className="font-medium">Load #{load.reference_id}</div>
                    <div className="text-sm text-gray-700">Driver: {getDriverName(load.driver_id)}</div>
                    <div className="text-sm text-gray-700">Pickup: {load.pickup_location} - {load.delivery_location}</div>
                    <div className="text-sm text-gray-700">Pickup Date: {load.pickup_datetime}</div>
                    <div className="text-sm text-gray-500">Status: {load.status}</div>
                  </div>
                ))
              )}
            </div>
          </section>
          {/* Recent Activity */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="rounded border bg-white p-4 shadow-sm flex flex-col gap-2">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  {activity}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button className="w-full rounded border px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 text-sm font-medium">[ Create invoice ]</button>
              <button className="w-full rounded border px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium">Generate Pay Statement</button>
            </div>
          </section>
        </div>
      </div>
      <div className="max-w-3xl mx-auto pb-8">
        <Link href="/driver-page">
          <button className="mt-8 w-full rounded border px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">Go to Driver Mobile View</button>
        </Link>
      </div>
    </>
  );
}
