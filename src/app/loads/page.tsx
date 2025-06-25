"use client";
import { useState, useMemo, useEffect } from "react";
import { useLoads, Load } from "./LoadContext";
import { useDrivers } from "../drivers/DriverContext";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";

const statusOptions = ["All", "Scheduled", "In-Transit", "Delivered"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

export default function LoadsPage() {
  const { loads, updateLoad, error: loadError, loading: loadLoading, fetchLoads } = useLoads();
  const { drivers, updateDriver } = useDrivers();
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Load | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [pickupsMap, setPickupsMap] = useState<Record<string, any[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, any[]>>({});
  const router = useRouter();

  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
      const driver = drivers.find((d) => d.id === l.driver_id);
      const matchesDriver = !driverFilter || (driver && driver.name === driverFilter);
      const pickupSearch = (pickupsMap[l.id] || []).some(
        (p) =>
          (p.address || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.state || "").toLowerCase().includes(search.toLowerCase())
      );
      const deliverySearch = (deliveriesMap[l.id] || []).some(
        (d) =>
          (d.address || "").toLowerCase().includes(search.toLowerCase()) ||
          (d.state || "").toLowerCase().includes(search.toLowerCase())
      );
      const matchesSearch =
        (l.reference_id || "").toLowerCase().includes(search.toLowerCase()) ||
        pickupSearch ||
        deliverySearch;
      return matchesStatus && matchesDriver && matchesSearch;
    });
  }, [loads, pickupsMap, deliveriesMap, statusFilter, driverFilter, search, drivers]);

  useEffect(() => {
    if (selected && editMode) {
      setEditForm({
        ...selected,
        pickups: pickupsMap[selected.id] ? pickupsMap[selected.id].map(p => ({ ...p })) : [],
        deliveries: deliveriesMap[selected.id] ? deliveriesMap[selected.id].map(d => ({ ...d })) : [],
      });
    }
  }, [selected, editMode, pickupsMap, deliveriesMap]);

  const fetchAllPickupsDeliveries = async () => {
    if (loads.length === 0) return;
    const loadIds = loads.map(l => l.id);
    const { data: pickups } = await supabase.from("pickups").select("*").in("load_id", loadIds);
    const { data: deliveries } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
    const pickupsByLoad: Record<string, any[]> = {};
    const deliveriesByLoad: Record<string, any[]> = {};
    pickups?.forEach(p => {
      if (!pickupsByLoad[p.load_id]) pickupsByLoad[p.load_id] = [];
      pickupsByLoad[p.load_id].push(p);
    });
    deliveries?.forEach(d => {
      if (!deliveriesByLoad[d.load_id]) deliveriesByLoad[d.load_id] = [];
      deliveriesByLoad[d.load_id].push(d);
    });
    setPickupsMap(pickupsByLoad);
    setDeliveriesMap(deliveriesByLoad);
  };

  useEffect(() => {
    fetchAllPickupsDeliveries();
  }, [loads]);

  function getDriverName(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : "Unknown";
  }

  function setStatus(load: Load, status: "Scheduled" | "In-Transit" | "Delivered") {
    updateLoad(load.id, { status });
    // Set driver status back to Available if delivered (handled by DriverContext effect)
    setSelected(null);
  }

  function handlePickupChange(idx: number, e: any) {
    const { name, value } = e.target;
    setEditForm((prev: any) => {
      const pickups = [...prev.pickups];
      pickups[idx] = { ...pickups[idx], [name]: value };
      return { ...prev, pickups };
    });
  }

  function handleDeliveryChange(idx: number, e: any) {
    const { name, value } = e.target;
    setEditForm((prev: any) => {
      const deliveries = [...prev.deliveries];
      deliveries[idx] = { ...deliveries[idx], [name]: value };
      return { ...prev, deliveries };
    });
  }

  function handleEditChange(e: any) {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  }

  async function handleEditSubmit(e: any) {
    e.preventDefault();
    if (!selected) return;
    // Update main load
    await updateLoad(selected.id, {
      driver_id: editForm.driver_id,
      rate: editForm.rate,
      notes: editForm.notes,
      broker_name: editForm.broker_name,
      broker_contact: editForm.broker_contact,
      broker_email: editForm.broker_email,
      load_type: editForm.load_type,
      temperature: editForm.temperature,
    });
    // Update pickups
    for (const p of editForm.pickups) {
      await supabase.from("pickups").update({
        address: p.address,
        state: p.state,
        datetime: p.datetime,
      }).eq("id", p.id);
    }
    // Update deliveries
    for (const d of editForm.deliveries) {
      await supabase.from("deliveries").update({
        address: d.address,
        state: d.state,
        datetime: d.datetime,
      }).eq("id", d.id);
    }
    await fetchAllPickupsDeliveries();
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
                <span className="font-semibold">Pickup:</span>
                <ol className="list-decimal ml-5">
                  {(pickupsMap[load.id] || []).map((p, i) => (
                    <li key={p.id || i}>{p.address}, {p.state} ({p.datetime})</li>
                  ))}
                </ol>
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Delivery:</span>
                <ol className="list-decimal ml-5">
                  {(deliveriesMap[load.id] || []).map((d, i) => (
                    <li key={d.id || i}>{d.address}, {d.state} ({d.datetime})</li>
                  ))}
                </ol>
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
                  <div><span className="font-semibold">Pickup:</span>
                    <ol className="list-decimal ml-5">
                      {(pickupsMap[selected.id] || []).map((p, i) => (
                        <li key={p.id || i}>{p.address}, {p.state} ({p.datetime})</li>
                      ))}
                    </ol>
                  </div>
                  <div><span className="font-semibold">Delivery:</span>
                    <ol className="list-decimal ml-5">
                      {(deliveriesMap[selected.id] || []).map((d, i) => (
                        <li key={d.id || i}>{d.address}, {d.state} ({d.datetime})</li>
                      ))}
                    </ol>
                  </div>
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
                {/* Pickups */}
                <div>
                  <label className="block font-medium mb-1">Pickups</label>
                  {editForm.pickups && editForm.pickups.length > 0 && editForm.pickups.map((pickup: any, idx: number) => (
                    <div key={pickup.id || idx} className="mb-2 border p-2 rounded">
                      <input
                        name="address"
                        value={pickup.address}
                        onChange={e => handlePickupChange(idx, e)}
                        className="w-full border rounded px-3 py-2 mb-1 bg-white text-gray-900"
                        placeholder="Pickup Address"
                      />
                      <select
                        name="state"
                        value={pickup.state}
                        onChange={e => handlePickupChange(idx, e)}
                        className="w-full border rounded px-3 py-2 mb-1 bg-white text-gray-900"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        name="datetime"
                        value={pickup.datetime ? pickup.datetime.slice(0, 16) : ''}
                        onChange={e => handlePickupChange(idx, e)}
                        className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                        placeholder="Pickup Date & Time"
                      />
                    </div>
                  ))}
                </div>
                {/* Deliveries */}
                <div>
                  <label className="block font-medium mb-1">Deliveries</label>
                  {editForm.deliveries && editForm.deliveries.length > 0 && editForm.deliveries.map((delivery: any, idx: number) => (
                    <div key={delivery.id || idx} className="mb-2 border p-2 rounded">
                      <input
                        name="address"
                        value={delivery.address}
                        onChange={e => handleDeliveryChange(idx, e)}
                        className="w-full border rounded px-3 py-2 mb-1 bg-white text-gray-900"
                        placeholder="Delivery Address"
                      />
                      <select
                        name="state"
                        value={delivery.state}
                        onChange={e => handleDeliveryChange(idx, e)}
                        className="w-full border rounded px-3 py-2 mb-1 bg-white text-gray-900"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        name="datetime"
                        value={delivery.datetime ? delivery.datetime.slice(0, 16) : ''}
                        onChange={e => handleDeliveryChange(idx, e)}
                        className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                        placeholder="Delivery Date & Time"
                      />
                    </div>
                  ))}
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