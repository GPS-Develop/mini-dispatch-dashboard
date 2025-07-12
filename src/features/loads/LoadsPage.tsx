"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLoads, Load } from "./LoadContext";
import { useDrivers } from "../../features/drivers/DriverContext";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import Button from '../../components/Button/Button';
import { formatPhoneForDisplay, sanitizePhone, formatRateForDisplay } from '../../utils/validation';
import DocumentUploadModal from '../../components/DocumentUploadModal/DocumentUploadModal';
import { EmptyLoads } from '../../components/EmptyState/EmptyState';
import { Pickup, Delivery, InputChangeEvent, SelectChangeEvent, TextareaChangeEvent, FormSubmitEvent } from '../../types';

const statusOptions = ["All", "Scheduled", "In-Transit", "Delivered"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

export default function LoadsPage() {
  const { loads, updateLoad, deleteLoad, error: loadError, loading: loadLoading } = useLoads();
  const { drivers } = useDrivers();
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Load | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<LoadEditForm | null>(null);
  const [pickupsMap, setPickupsMap] = useState<Record<string, Pickup[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState<Load | null>(null);

  // Define the edit form type
  interface LoadEditForm {
    id: string;
    reference_id: string;
    driver_id: string;
    rate: number;
    notes?: string;
    broker_name: string;
    broker_contact: number;
    broker_email: string;
    load_type: string;
    temperature?: number | null;
    pickups: Pickup[];
    deliveries: Delivery[];
    pickup_address: string;
    pickup_state: string;
    pickup_datetime: string;
    delivery_address: string;
    delivery_state: string;
    delivery_datetime: string;
    status: "Scheduled" | "In-Transit" | "Delivered";
  }
  const router = useRouter();
  const supabase = createClient();

  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
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

  const fetchAllPickupsDeliveries = useCallback(async () => {
    if (loads.length === 0) return;
    try {
    const loadIds = loads.map(l => l.id);
      const { data: pickups, error: pickupsError } = await supabase.from("pickups").select("*").in("load_id", loadIds);
      const { data: deliveries, error: deliveriesError } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
      
      if (pickupsError || deliveriesError) {
        setError(pickupsError?.message || deliveriesError?.message || 'Failed to fetch pickup/delivery data');
        return;
      }
      
    const pickupsByLoad: Record<string, Pickup[]> = {};
    const deliveriesByLoad: Record<string, Delivery[]> = {};
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
  }, [loads, supabase]);

  useEffect(() => {
    fetchAllPickupsDeliveries();
  }, [loads, fetchAllPickupsDeliveries]);

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

  function handlePickupChange(idx: number, e: InputChangeEvent | SelectChangeEvent) {
    const { name, value } = e.target;
    setEditForm((prev: LoadEditForm | null) => {
      if (!prev) return null;
      const pickups = [...prev.pickups];
      pickups[idx] = { ...pickups[idx], [name]: value };
      return { ...prev, pickups };
    });
  }

  function handleDeliveryChange(idx: number, e: InputChangeEvent | SelectChangeEvent) {
    const { name, value } = e.target;
    setEditForm((prev: LoadEditForm | null) => {
      if (!prev) return null;
      const deliveries = [...prev.deliveries];
      deliveries[idx] = { ...deliveries[idx], [name]: value };
      return { ...prev, deliveries };
    });
  }

  function handleEditChange(e: InputChangeEvent | SelectChangeEvent | TextareaChangeEvent) {
    const { name, value } = e.target;
    setEditForm((prev: LoadEditForm | null) => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  }

  async function handleEditSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    if (!selected || !editForm) return;
    
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
    const convertedRate = editForm.rate || 0;
    
    const updatedData = {
      driver_id: editForm.driver_id,
      rate: convertedRate,
      notes: editForm.notes,
      broker_name: editForm.broker_name,
      broker_contact: parseInt(sanitizedBrokerContact) || 0,
      broker_email: editForm.broker_email,
      load_type: editForm.load_type,
      temperature: editForm.temperature == null ? null : editForm.temperature,
    };
    await updateLoad(selected.id, updatedData);
      
    // Update pickups
    for (const p of editForm.pickups) {
        const { error: pickupError } = await supabase.from("pickups").update({
        address: p.address,
        city: p.city,
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
        city: d.city,
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
    <div className="page-container-xl">
      <div className="page-header">
        <h1 className="heading-xl">Loads</h1>
      </div>
      
      {(error || loadError) && (
        <div className="alert-error">
          {error || loadError}
        </div>
      )}
      
      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by Load ID or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field filter-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field filter-input"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="input-field filter-input"
        >
          <option value="">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
      
      <div className="loads-grid">
        {filteredLoads.length === 0 ? (
          <EmptyLoads onCreateLoad={() => router.push('/add-load')} />
        ) : (
          filteredLoads.map((load) => (
            <div
              key={load.id}
              className="load-card"
              onClick={() => setSelected(load)}
            >
              <div className="load-card-title">Load #{load.reference_id}</div>
              <div className="load-card-detail">
                <span className="load-card-detail-label">Pickup:</span>
                <ol className="load-card-list">
                  {(pickupsMap[load.id] || []).map((p, i) => (
                    <li key={p.id || i}>{p.address}, {p.city ? `${p.city}, ` : ''}{p.state} ({p.datetime})</li>
                  ))}
                </ol>
              </div>
              <div className="load-card-detail">
                <span className="load-card-detail-label">Delivery:</span>
                <ol className="load-card-list">
                  {(deliveriesMap[load.id] || []).map((d, i) => (
                    <li key={d.id || i}>{d.address}, {d.city ? `${d.city}, ` : ''}{d.state} ({d.datetime})</li>
                  ))}
                </ol>
              </div>
              <div className="load-card-detail">
                <span className="load-card-detail-label">Driver:</span> {getDriverName(load.driver_id)}
              </div>
              <div className="load-card-detail">
                <span className="load-card-detail-label">Rate:</span> ${formatRateForDisplay(load.rate)}
              </div>
              <div className="load-card-detail">
                <span className="load-card-detail-label">Status:</span> {load.status}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Modal for load details */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}>
          {!editMode ? (
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn"
                onClick={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}
                aria-label="Close"
              >
                ×
              </button>
              <div className="modal-header">
                <h2 className="heading-lg">Load #{selected.reference_id}</h2>
              </div>
              <div className="modal-body">
                <div className="space-y-4">
                  <div>
                    <span className="load-card-detail-label">Pickup:</span>
                    <ol className="load-card-list">
                      {(pickupsMap[selected.id] || []).map((p, i) => (
                        <li key={p.id || i}>{p.address}, {p.city ? `${p.city}, ` : ''}{p.state} ({p.datetime})</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <span className="load-card-detail-label">Delivery:</span>
                    <ol className="load-card-list">
                      {(deliveriesMap[selected.id] || []).map((d, i) => (
                        <li key={d.id || i}>{d.address}, {d.city ? `${d.city}, ` : ''}{d.state} ({d.datetime})</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <span className="load-card-detail-label">Driver:</span> {getDriverName(selected.driver_id)}
                  </div>
                  <div>
                    <span className="load-card-detail-label">Rate:</span> ${formatRateForDisplay(selected.rate)}
                  </div>
                  <div>
                    <span className="load-card-detail-label">Status:</span> {selected.status}
                  </div>
                  <div>
                    <span className="load-card-detail-label">Broker:</span> {selected.broker_name}, {formatPhoneForDisplay(selected.broker_contact)}, {selected.broker_email}
                  </div>
                  <div>
                    <span className="load-card-detail-label">Notes:</span> {selected.notes || <span className="text-muted">None</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <div className="button-group" style={{ width: '100%' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="teal"
                    onClick={() => setShowUploadModal(true)}
                  >
                    📄 Upload/View Documents
                  </Button>
                  {selected.status !== "Delivered" && (
                    <Button
                      variant="success"
                      onClick={() => setStatus(selected, "Delivered")}
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  {selected.status !== "In-Transit" && (
                    <Button
                      variant="warning"
                      onClick={() => setStatus(selected, "In-Transit")}
                    >
                      Set as In-Transit
                    </Button>
                  )}
                  {selected.status !== "Scheduled" && (
                    <Button
                      variant="indigo"
                      onClick={() => setStatus(selected, "Scheduled")}
                    >
                      Set as Scheduled
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteClick(selected)}
                    style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}
                  >
                    🗑️ Delete Load
                  </Button>
                </div>
              </div>
            </div>
          ) : editForm ? (
            <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn"
                onClick={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}
                aria-label="Close"
              >
                ×
              </button>
              <form className="form-container" onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <h2 className="heading-lg">Edit Load #{selected.reference_id}</h2>
                </div>
                <div className="modal-body">
                  {/* Pickups */}
                  <div className="edit-form-section">
                    <div className="edit-form-section-title">Pickup Locations</div>
                    {editForm.pickups && editForm.pickups.length > 0 && editForm.pickups.map((pickup: Pickup, idx: number) => (
                      <div key={pickup.id || idx} className="edit-form-item">
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="label-text">Address</label>
                            <input
                              name="address"
                              value={pickup.address}
                              onChange={e => handlePickupChange(idx, e)}
                              className="input-field"
                              placeholder="Pickup Address"
                            />
                          </div>
                          <div className="form-group">
                            <label className="label-text">City</label>
                            <input
                              name="city"
                              value={pickup.city || ''}
                              onChange={e => handlePickupChange(idx, e)}
                              className="input-field"
                              placeholder="Pickup City"
                            />
                          </div>
                          <div className="form-group">
                            <label className="label-text">State</label>
                            <select
                              name="state"
                              value={pickup.state}
                              onChange={e => handlePickupChange(idx, e)}
                              className="input-field"
                            >
                              <option value="">Select State</option>
                              {US_STATES.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="label-text">Date & Time</label>
                            <input
                              type="datetime-local"
                              name="datetime"
                              value={pickup.datetime ? pickup.datetime.slice(0, 16) : ''}
                              onChange={e => handlePickupChange(idx, e)}
                              className="input-field"
                              placeholder="Pickup Date & Time"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Deliveries */}
                  <div className="edit-form-section">
                    <div className="edit-form-section-title">Delivery Locations</div>
                    {editForm.deliveries && editForm.deliveries.length > 0 && editForm.deliveries.map((delivery: Delivery, idx: number) => (
                      <div key={delivery.id || idx} className="edit-form-item">
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="label-text">Address</label>
                            <input
                              name="address"
                              value={delivery.address}
                              onChange={e => handleDeliveryChange(idx, e)}
                              className="input-field"
                              placeholder="Delivery Address"
                            />
                          </div>
                          <div className="form-group">
                            <label className="label-text">City</label>
                            <input
                              name="city"
                              value={delivery.city || ''}
                              onChange={e => handleDeliveryChange(idx, e)}
                              className="input-field"
                              placeholder="Delivery City"
                            />
                          </div>
                          <div className="form-group">
                            <label className="label-text">State</label>
                            <select
                              name="state"
                              value={delivery.state}
                              onChange={e => handleDeliveryChange(idx, e)}
                              className="input-field"
                            >
                              <option value="">Select State</option>
                              {US_STATES.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="label-text">Date & Time</label>
                            <input
                              type="datetime-local"
                              name="datetime"
                              value={delivery.datetime ? delivery.datetime.slice(0, 16) : ''}
                              onChange={e => handleDeliveryChange(idx, e)}
                              className="input-field"
                              placeholder="Delivery Date & Time"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Load Details */}
                  <div className="edit-form-section">
                    <div className="edit-form-section-title">Load Details</div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="label-text">Driver</label>
                        <select name="driver_id" value={editForm.driver_id} onChange={handleEditChange} className="input-field">
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="label-text">Rate ($)</label>
                        <input 
                          name="rate" 
                          type="number"
                          min="0"
                          step="1"
                          value={editForm.rate || ""} 
                          onChange={handleEditChange} 
                          className="input-field"
                          placeholder="2500"
                        />
                      </div>
                      <div className="form-group">
                        <label className="label-text">Load Type</label>
                        <select name="load_type" value={editForm.load_type} onChange={handleEditChange} className="input-field">
                          <option value="Reefer">Reefer</option>
                          <option value="Dry Van">Dry Van</option>
                          <option value="Flatbed">Flatbed</option>
                        </select>
                      </div>
                      {editForm.load_type === "Reefer" && (
                        <div className="form-group">
                          <label className="label-text">Temperature (°F)</label>
                          <input 
                            name="temperature" 
                            type="number"
                            step="0.1"
                            min="-100"
                            max="200"
                            value={editForm.temperature || ""} 
                            onChange={handleEditChange} 
                            className="input-field"
                            placeholder="e.g., -10, 35, 72"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Broker Information */}
                  <div className="edit-form-section">
                    <div className="edit-form-section-title">Broker Information</div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="label-text">Broker Name</label>
                        <input name="broker_name" value={editForm.broker_name} onChange={handleEditChange} className="input-field" />
                      </div>
                      <div className="form-group">
                        <label className="label-text">Broker Contact</label>
                        <input 
                          name="broker_contact" 
                          type="tel"
                          value={editForm.broker_contact?.toString() || ""} 
                          onChange={handleEditChange} 
                          className="input-field"
                          placeholder="(555) 123-4567"
                        />
                        <div className="text-hint">Enter phone number (formatting will be removed)</div>
                      </div>
                      <div className="form-group">
                        <label className="label-text">Broker Email</label>
                        <input name="broker_email" value={editForm.broker_email} onChange={handleEditChange} className="input-field" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div className="edit-form-section">
                    <div className="form-group">
                      <label className="label-text">Notes</label>
                      <textarea name="notes" value={editForm.notes || ""} onChange={handleEditChange} className="input-field" rows={3} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <div className="button-group-horizontal">
                    <Button type="button" variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting || loadLoading}>
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          ) : null}
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
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="heading-lg text-danger">⚠️ Confirm Delete</h2>
            </div>
            <div className="modal-body">
              <p className="text-primary mb-4">
                Are you sure you want to delete <strong>Load #{loadToDelete.reference_id}</strong>?
              </p>
              <p className="text-muted">
                This action cannot be undone. All associated pickups, deliveries, and documents will also be deleted.
              </p>
            </div>
            <div className="modal-footer">
              <div className="button-group-horizontal">
                <Button
                  variant="secondary"
                  onClick={cancelDelete}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmDelete}
                >
                  Delete Load
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 