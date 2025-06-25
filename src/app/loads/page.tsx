"use client";
import { useState, useMemo, useEffect } from "react";
import { useLoads, Load } from "./LoadContext";
import { useDrivers } from "../drivers/DriverContext";

const statusOptions = ["All", "Scheduled", "In-Transit", "Delivered"];

export default function LoadsPage() {
  const { loads, updateLoad, error: loadError, loading: loadLoading } = useLoads();
  const { drivers, updateDriver } = useDrivers();
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Load | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
      const driver = drivers.find((d) => d.id === l.driver_id);
      const matchesDriver = !driverFilter || (driver && driver.name === driverFilter);
      const matchesSearch =
        (l.reference_id || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.pickup_location || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.delivery_location || "").toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesDriver && matchesSearch;
    });
  }, [loads, statusFilter, driverFilter, search, drivers]);

  useEffect(() => {
    if (selected && editMode) {
      setEditForm({ ...selected });
    }
  }, [selected, editMode]);

  function getDriverName(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : "Unknown";
  }

  function setStatus(load: Load, status: "Scheduled" | "In-Transit" | "Delivered") {
    updateLoad(load.id, { status });
    // Set driver status back to Available if delivered (handled by DriverContext effect)
    setSelected(null);
  }

  function handleEditChange(e: any) {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  }

  async function handleEditSubmit(e: any) {
    e.preventDefault();
    if (!selected) return;
    await updateLoad(selected.id, {
      pickup_location: editForm.pickup_location,
      pickup_datetime: editForm.pickup_datetime,
      delivery_location: editForm.delivery_location,
      delivery_datetime: editForm.delivery_datetime,
      driver_id: editForm.driver_id,
      rate: editForm.rate,
      notes: editForm.notes,
      broker_name: editForm.broker_name,
      broker_contact: editForm.broker_contact,
      broker_email: editForm.broker_email,
      load_type: editForm.load_type,
      temperature: editForm.temperature,
    });
    if (!loadError) {
      setEditMode(false);
      setSelected(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Loads</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Search by Load ID or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 bg-white text-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 bg-white text-gray-900"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="border rounded px-3 py-2 bg-white text-gray-900"
        >
          <option value="">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLoads.length === 0 ? (
          <div className="text-gray-500 col-span-2">No loads found.</div>
        ) : (
          filteredLoads.map((load) => (
            <div
              key={load.id}
              className="rounded border bg-white p-4 shadow-sm cursor-pointer hover:border-blue-500"
              onClick={() => setSelected(load)}
            >
              <div className="font-medium text-lg">Load #{load.reference_id}</div>
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Pickup:</span> {load.pickup_location} ({load.pickup_datetime})
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Delivery:</span> {load.delivery_location} ({load.delivery_datetime})
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Driver:</span> {getDriverName(load.driver_id)}
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Rate:</span> {load.rate}
              </div>
              <div className="text-sm text-gray-500 mb-1">
                <span className="font-semibold">Status:</span> {load.status}
              </div>
              <div className="flex gap-2 mt-2">
                {/* Removed bolUrl and podUrl icons */}
              </div>
            </div>
          ))
        )}
      </div>
      {/* Modal for load details */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md relative max-h-[80vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={() => { setSelected(null); setEditMode(false); }}
              aria-label="Close"
            >
              ×
            </button>
            {!editMode ? (
              <>
                <h2 className="text-xl font-bold mb-2">Load #{selected.reference_id}</h2>
                <div className="mb-2 text-sm text-gray-700">
                  <div><span className="font-semibold">Pickup:</span> {selected.pickup_location} ({selected.pickup_datetime})</div>
                  <div><span className="font-semibold">Delivery:</span> {selected.delivery_location} ({selected.delivery_datetime})</div>
                  <div><span className="font-semibold">Driver:</span> {getDriverName(selected.driver_id)}</div>
                  <div><span className="font-semibold">Rate:</span> {selected.rate}</div>
                  <div><span className="font-semibold">Status:</span> {selected.status}</div>
                </div>
                <div className="mb-2 text-sm text-gray-700">
                  <div><span className="font-semibold">Broker:</span> {selected.broker_name}, {selected.broker_contact}, {selected.broker_email}</div>
                  <div><span className="font-semibold">Notes:</span> {selected.notes || <span className="text-gray-400">None</span>}</div>
                </div>
                <div className="mb-2 text-sm text-gray-700 flex gap-4">
                  {/* Removed BOL and POD links */}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    className="w-full bg-gray-200 text-gray-900 rounded px-4 py-2 font-semibold hover:bg-gray-300 transition"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </button>
                  {selected.status !== "Delivered" && (
                    <button
                      className="w-full bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 transition"
                      onClick={() => setStatus(selected, "Delivered")}
                    >
                      Mark as Delivered
                    </button>
                  )}
                  {selected.status !== "In-Transit" && (
                    <button
                      className="w-full bg-yellow-500 text-white rounded px-4 py-2 font-semibold hover:bg-yellow-600 transition"
                      onClick={() => setStatus(selected, "In-Transit")}
                    >
                      Set as In-Transit
                    </button>
                  )}
                  {selected.status !== "Scheduled" && (
                    <button
                      className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition"
                      onClick={() => setStatus(selected, "Scheduled")}
                    >
                      Set as Scheduled
                    </button>
                  )}
                </div>
              </>
            ) : editForm ? (
              <form className="space-y-3" onSubmit={handleEditSubmit}>
                <h2 className="text-xl font-bold mb-2">Edit Load #{selected.reference_id}</h2>
                <div>
                  <label className="block font-medium mb-1">Pickup Location</label>
                  <input name="pickup_location" value={editForm.pickup_location} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Pickup Date & Time</label>
                  <input type="datetime-local" name="pickup_datetime" value={editForm.pickup_datetime} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Delivery Location</label>
                  <input name="delivery_location" value={editForm.delivery_location} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Delivery Date & Time</label>
                  <input type="datetime-local" name="delivery_datetime" value={editForm.delivery_datetime} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Driver</label>
                  <select name="driver_id" value={editForm.driver_id} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900">
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Rate</label>
                  <input name="rate" value={editForm.rate} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Load Type</label>
                  <select name="load_type" value={editForm.load_type} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900">
                    <option value="Reefer">Reefer</option>
                    <option value="Dry Van">Dry Van</option>
                    <option value="Flatbed">Flatbed</option>
                  </select>
                </div>
                {editForm.load_type === "Reefer" && (
                  <div>
                    <label className="block font-medium mb-1">Temperature</label>
                    <input name="temperature" value={editForm.temperature || ""} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                  </div>
                )}
                <div>
                  <label className="block font-medium mb-1">Broker Name</label>
                  <input name="broker_name" value={editForm.broker_name} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Broker Contact</label>
                  <input name="broker_contact" value={editForm.broker_contact} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Broker Email</label>
                  <input name="broker_email" value={editForm.broker_email} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Notes</label>
                  <textarea name="notes" value={editForm.notes || ""} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" rows={2} />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700" disabled={loadLoading}>Save</button>
                </div>
                {loadError && <div className="text-red-600 text-center font-medium mt-2">{loadError}</div>}
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
} 