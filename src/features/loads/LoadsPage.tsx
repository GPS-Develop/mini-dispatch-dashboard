"use client";
import { useState, useMemo, useEffect } from "react";
import { useLoads, Load } from "./LoadContext";
import { useDrivers } from "../../features/drivers/DriverContext";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";
import Button from '../../components/Button/Button';
import { formatPhoneForDisplay, sanitizePhone, formatRateForDisplay } from '../../utils/validation';
import DocumentUploadModal from '../../components/DocumentUploadModal/DocumentUploadModal';

const statusOptions = ["All", "Scheduled", "In-Transit", "Delivered"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

export default function LoadsPage() {
  const { loads, updateLoad, deleteLoad, error: loadError, loading: loadLoading, fetchLoads } = useLoads();
  const { drivers, updateDriver } = useDrivers();
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Load | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [pickupsMap, setPickupsMap] = useState<Record<string, any[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, any[]>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState<Load | null>(null);
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
    try {
    const loadIds = loads.map(l => l.id);
      const { data: pickups, error: pickupsError } = await supabase.from("pickups").select("*").in("load_id", loadIds);
      const { data: deliveries, error: deliveriesError } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
      
      if (pickupsError || deliveriesError) {
        setError(pickupsError?.message || deliveriesError?.message || 'Failed to fetch pickup/delivery data');
        return;
      }
      
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pickup/delivery data');
    }
  };

  useEffect(() => {
    fetchAllPickupsDeliveries();
  }, [loads]);

  function getDriverName(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return "Unknown";
    if (driver.driver_status !== "active") {
      return `${driver.name} (${driver.driver_status.charAt(0).toUpperCase() + driver.driver_status.slice(1)})`;
    }
    return driver.name;
  }

  async function setStatus(load: Load, status: "Scheduled" | "In-Transit" | "Delivered") {
    setError("");
    try {
      await updateLoad(load.id, { status });
    setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update load status');
    }
  }

  function handleDeleteClick(load: Load) {
    setLoadToDelete(load);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!loadToDelete) return;
    
    setError("");
    try {
      await deleteLoad(loadToDelete.id);
      setSelected(null);
      setShowDeleteConfirm(false);
      setLoadToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete load');
    }
  }

  function cancelDelete() {
    setShowDeleteConfirm(false);
    setLoadToDelete(null);
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
    
    setIsSubmitting(true);
    setError("");
    
    // Validate broker contact before submission
    const brokerContactStr = typeof editForm.broker_contact === 'number' ? 
      editForm.broker_contact.toString() : 
      editForm.broker_contact || '';
    const sanitizedBrokerContact = sanitizePhone(brokerContactStr);
    if (!sanitizedBrokerContact || sanitizedBrokerContact.length < 10) {
      setError("Broker contact must be a valid phone number");
      setIsSubmitting(false);
      return;
    }
    
    try {
    // Update main load
    const updatedData = {
      driver_id: editForm.driver_id,
      rate: editForm.rate,
      notes: editForm.notes,
      broker_name: editForm.broker_name,
      broker_contact: parseInt(sanitizedBrokerContact) || 0,
      broker_email: editForm.broker_email,
      load_type: editForm.load_type,
      temperature: editForm.temperature === "" || editForm.temperature == null ? null : parseFloat(editForm.temperature.toString()),
    };
    await updateLoad(selected.id, updatedData);
      
    // Update pickups
    for (const p of editForm.pickups) {
        const { error: pickupError } = await supabase.from("pickups").update({
        address: p.address,
        state: p.state,
        datetime: p.datetime,
      }).eq("id", p.id);
        
        if (pickupError) {
          throw new Error(`Failed to update pickup: ${pickupError.message}`);
        }
    }
      
    // Update deliveries
    for (const d of editForm.deliveries) {
        const { error: deliveryError } = await supabase.from("deliveries").update({
        address: d.address,
        state: d.state,
        datetime: d.datetime,
      }).eq("id", d.id);
        
        if (deliveryError) {
          throw new Error(`Failed to update delivery: ${deliveryError.message}`);
        }
    }
      
      // Refresh pickup/delivery data
    await fetchAllPickupsDeliveries();
      
      setEditMode(false);
      setSelected(null);
      setEditForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update load');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Loads</h1>
      
      {(error || loadError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error || loadError}
        </div>
      )}
      
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
                <span className="font-semibold">Rate:</span> ${formatRateForDisplay(load.rate)}
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
              onClick={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}
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
                  <div><span className="font-semibold">Rate:</span> ${formatRateForDisplay(selected.rate)}</div>
                  <div><span className="font-semibold">Status:</span> {selected.status}</div>
                </div>
                <div className="mb-2 text-sm text-gray-700">
                  <div><span className="font-semibold">Broker:</span> {selected.broker_name}, {formatPhoneForDisplay(selected.broker_contact)}, {selected.broker_email}</div>
                  <div><span className="font-semibold">Notes:</span> {selected.notes || <span className="text-gray-400">None</span>}</div>
                </div>
                <div className="mb-2 text-sm text-gray-700 flex gap-4">
                  {/* Removed BOL and POD links */}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    variant="secondary"
                    className="w-full bg-gray-200 text-gray-900 rounded px-4 py-2 font-semibold hover:bg-gray-300 transition"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="primary"
                    className="w-full bg-purple-600 text-white rounded px-4 py-2 font-semibold hover:bg-purple-700 transition"
                    onClick={() => setShowUploadModal(true)}
                  >
                    📄 Upload Documents
                  </Button>
                  {selected.status !== "Delivered" && (
                    <Button
                      variant="success"
                      className="w-full bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 transition"
                      onClick={() => setStatus(selected, "Delivered")}
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  {selected.status !== "In-Transit" && (
                    <Button
                      variant="warning"
                      className="w-full bg-yellow-500 text-white rounded px-4 py-2 font-semibold hover:bg-yellow-600 transition"
                      onClick={() => setStatus(selected, "In-Transit")}
                    >
                      Set as In-Transit
                    </Button>
                  )}
                  {selected.status !== "Scheduled" && (
                    <Button
                      variant="primary"
                      className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition"
                      onClick={() => setStatus(selected, "Scheduled")}
                    >
                      Set as Scheduled
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="w-full bg-red-600 text-white rounded px-4 py-2 font-semibold hover:bg-red-700 transition mt-4 border-t pt-4"
                    onClick={() => handleDeleteClick(selected)}
                  >
                    🗑️ Delete Load
                  </Button>
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
                  <label className="block font-medium mb-1">Rate ($)</label>
                  <input 
                    name="rate" 
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.rate || ""} 
                    onChange={handleEditChange} 
                    className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                    placeholder="2500"
                  />
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
                                  <label className="block font-medium mb-1">Temperature (°F)</label>
              <input 
                name="temperature" 
                type="number"
                step="0.1"
                min="-100"
                max="200"
                value={editForm.temperature || ""} 
                onChange={handleEditChange} 
                className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                placeholder="e.g., -10, 35, 72"
              />
                  </div>
                )}
                <div>
                  <label className="block font-medium mb-1">Broker Name</label>
                  <input name="broker_name" value={editForm.broker_name} onChange={handleEditChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Broker Contact</label>
                  <input 
                    name="broker_contact" 
                    type="tel"
                    value={editForm.broker_contact?.toString() || ""} 
                    onChange={handleEditChange} 
                    className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                    placeholder="(555) 123-4567"
                  />
                  <div className="text-xs text-gray-500 mt-1">Enter phone number (formatting will be removed)</div>
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
                  <Button type="button" variant="secondary" onClick={() => setEditMode(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</Button>
                  <Button type="submit" variant="primary" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700" disabled={isSubmitting || loadLoading}>Save</Button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showUploadModal && selected && (
        <DocumentUploadModal
          loadId={selected.id}
          loadReferenceId={selected.reference_id}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && loadToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Confirm Delete</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>Load #{loadToDelete.reference_id}</strong>?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone. All associated pickups, deliveries, and documents will also be deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={confirmDelete}
              >
                Delete Load
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 