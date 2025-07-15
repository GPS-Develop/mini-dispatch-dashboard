"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLoads, Load } from "./LoadContext";
import { useDrivers } from "../../features/drivers/DriverContext";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { sanitizePhone } from '../../utils/validation';
import DocumentUploadModal from '../../components/DocumentUploadModal/DocumentUploadModal';
import { EmptyLoads } from '../../components/EmptyState/EmptyState';
import { Pickup, Delivery, LumperService, LumperServiceForm, InputChangeEvent, SelectChangeEvent, TextareaChangeEvent, FormSubmitEvent } from '../../types';
import { LoadFilters } from './components/LoadFilters';
import { LoadCard } from './components/LoadCard';
import { LoadDetailsModal } from './components/LoadDetailsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { LoadEditForm } from './components/LoadEditForm';
import ModalErrorBoundary from '../../components/ErrorBoundary/ModalErrorBoundary';
import FormErrorBoundary from '../../components/ErrorBoundary/FormErrorBoundary';


export default function LoadsPage() {
  const { loads, updateLoad, deleteLoad, error: loadError } = useLoads();
  const { drivers } = useDrivers();
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Load | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<LoadEditForm | null>(null);
  const [pickupsMap, setPickupsMap] = useState<Record<string, Pickup[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [lumperMap, setLumperMap] = useState<Record<string, LumperService>>({});
  const [lumperForm, setLumperForm] = useState<LumperServiceForm>({
    no_lumper: false,
    paid_by_broker: false,
    paid_by_company: false,
    paid_by_driver: false,
    broker_amount: '',
    company_amount: '',
    driver_amount: '',
    driver_payment_reason: ''
  });
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
      const fetchLumperForEdit = async () => {
        try {
          // Fetch lumper service for this specific load
          const { data: lumperService } = await supabase
            .from('lumper_services')
            .select('*')
            .eq('load_id', selected.id)
            .single();

          if (lumperService) {
            setLumperForm({
              no_lumper: lumperService.no_lumper || false,
              paid_by_broker: lumperService.paid_by_broker,
              paid_by_company: lumperService.paid_by_company,
              paid_by_driver: lumperService.paid_by_driver,
              broker_amount: lumperService.broker_amount?.toString() || '',
              company_amount: lumperService.company_amount?.toString() || '',
              driver_amount: lumperService.driver_amount?.toString() || '',
              driver_payment_reason: lumperService.driver_payment_reason || ''
            });
          } else {
            // Reset form for new lumper service
            setLumperForm({
              no_lumper: false,
              paid_by_broker: false,
              paid_by_company: false,
              paid_by_driver: false,
              broker_amount: '',
              company_amount: '',
              driver_amount: '',
              driver_payment_reason: ''
            });
          }
        } catch (error) {
          console.error('Error fetching lumper service for edit:', error);
          // Reset form on error
          setLumperForm({
            no_lumper: false,
            paid_by_broker: false,
            paid_by_company: false,
            paid_by_driver: false,
            broker_amount: '',
            company_amount: '',
            driver_amount: '',
            driver_payment_reason: ''
          });
        }
      };

      setEditForm({
        ...selected,
        pickups: pickupsMap[selected.id] ? pickupsMap[selected.id].map(p => ({ ...p })) : [],
        deliveries: deliveriesMap[selected.id] ? deliveriesMap[selected.id].map(d => ({ ...d })) : [],
      });
      
      // Fetch lumper data specifically for this load
      fetchLumperForEdit();
    }
  }, [selected, editMode, pickupsMap, deliveriesMap, supabase]);

  const fetchAllPickupsDeliveries = useCallback(async () => {
    if (loads.length === 0) return;
    try {
    const loadIds = loads.map(l => l.id);
      const { data: pickups, error: pickupsError } = await supabase.from("pickups").select("*").in("load_id", loadIds);
      const { data: deliveries, error: deliveriesError } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
      const { data: lumperServices, error: lumperError } = await supabase.from("lumper_services").select("*").in("load_id", loadIds);
      
      if (pickupsError || deliveriesError || lumperError) {
        setError(pickupsError?.message || deliveriesError?.message || lumperError?.message || 'Failed to fetch load data');
        return;
      }
      
    const pickupsByLoad: Record<string, Pickup[]> = {};
    const deliveriesByLoad: Record<string, Delivery[]> = {};
    const lumperByLoad: Record<string, LumperService> = {};
    
    pickups?.forEach(p => {
      if (!pickupsByLoad[p.load_id]) pickupsByLoad[p.load_id] = [];
      pickupsByLoad[p.load_id].push(p);
    });
    deliveries?.forEach(d => {
      if (!deliveriesByLoad[d.load_id]) deliveriesByLoad[d.load_id] = [];
      deliveriesByLoad[d.load_id].push(d);
    });
    lumperServices?.forEach(l => {
      lumperByLoad[l.load_id] = l;
    });
    
    setPickupsMap(pickupsByLoad);
    setDeliveriesMap(deliveriesByLoad);
    setLumperMap(lumperByLoad);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch load data');
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

  function handleLumperCheckboxChange(field: keyof Pick<LumperServiceForm, 'no_lumper' | 'paid_by_broker' | 'paid_by_company' | 'paid_by_driver'>) {
    setLumperForm(prev => {
      const newForm = { ...prev, [field]: !prev[field] };
      
      // If "No Lumper" is checked, uncheck all other options
      if (field === 'no_lumper' && newForm.no_lumper) {
        return {
          no_lumper: true,
          paid_by_broker: false,
          paid_by_company: false,
          paid_by_driver: false,
          broker_amount: '',
          company_amount: '',
          driver_amount: '',
          driver_payment_reason: ''
        };
      }
      
      // If any other option is checked, uncheck "No Lumper"
      if (field !== 'no_lumper' && newForm[field]) {
        newForm.no_lumper = false;
      }
      
      return newForm;
    });
  }

  function handleLumperInputChange(field: keyof LumperServiceForm, value: string) {
    setLumperForm(prev => ({ ...prev, [field]: value }));
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
        name: p.name,
        address: p.address,
        city: p.city,
        state: p.state,
        postal_code: p.postal_code,
        datetime: p.datetime,
      }).eq("id", p.id);
        
        if (pickupError) {
          throw new Error(`Failed to update pickup: ${pickupError.message}`);
        }
    }
      
    // Update deliveries
    for (const d of editForm.deliveries) {
        const { error: deliveryError } = await supabase.from("deliveries").update({
        name: d.name,
        address: d.address,
        city: d.city,
        state: d.state,
        postal_code: d.postal_code,
        datetime: d.datetime,
      }).eq("id", d.id);
        
        if (deliveryError) {
          throw new Error(`Failed to update delivery: ${deliveryError.message}`);
        }
    }
      
      // Handle lumper service
      const existingLumperService = lumperMap[selected.id];
      
      // Prepare lumper service data
      const lumperData = {
        load_id: selected.id,
        no_lumper: lumperForm.no_lumper,
        paid_by_broker: lumperForm.paid_by_broker,
        paid_by_company: lumperForm.paid_by_company,
        paid_by_driver: lumperForm.paid_by_driver,
        broker_amount: lumperForm.broker_amount ? parseFloat(lumperForm.broker_amount) : null,
        company_amount: lumperForm.company_amount ? parseFloat(lumperForm.company_amount) : null,
        driver_amount: lumperForm.driver_amount ? parseFloat(lumperForm.driver_amount) : null,
        driver_payment_reason: lumperForm.driver_payment_reason || null
      };
      
      if (existingLumperService) {
        // Update existing lumper service
        const { error: lumperError } = await supabase
          .from('lumper_services')
          .update(lumperData)
          .eq('id', existingLumperService.id);
          
        if (lumperError) {
          throw new Error(`Failed to update lumper service: ${lumperError.message}`);
        }
      } else {
        // Create new lumper service
        const { error: lumperError } = await supabase
          .from('lumper_services')
          .insert([lumperData]);
          
        if (lumperError) {
          throw new Error(`Failed to create lumper service: ${lumperError.message}`);
        }
      }
      
      // Refresh pickup/delivery/lumper data
    await fetchAllPickupsDeliveries();
      
      setEditMode(false);
      setSelected(null);
      setEditForm(null);
      setLumperForm({
        no_lumper: false,
        paid_by_broker: false,
        paid_by_company: false,
        paid_by_driver: false,
        broker_amount: '',
        company_amount: '',
        driver_amount: '',
        driver_payment_reason: ''
      });
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
      
      <LoadFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        driverFilter={driverFilter}
        setDriverFilter={setDriverFilter}
        drivers={drivers}
      />
      
      <div className="loads-grid">
        {filteredLoads.length === 0 ? (
          <EmptyLoads onCreateLoad={() => router.push('/add-load')} />
        ) : (
          filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              pickups={pickupsMap[load.id] || []}
              deliveries={deliveriesMap[load.id] || []}
              getDriverName={getDriverName}
              onClick={() => setSelected(load)}
            />
          ))
        )}
      </div>
      
      {/* Modal for load details */}
      {selected && (
        <ModalErrorBoundary onClose={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}>
          <div className="modal-overlay" onClick={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}>
            {!editMode ? (
              <LoadDetailsModal
                load={selected}
                pickups={pickupsMap[selected.id] || []}
                deliveries={deliveriesMap[selected.id] || []}
                getDriverName={getDriverName}
                onClose={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}
                onEdit={() => setEditMode(true)}
                onUploadDocuments={() => setShowUploadModal(true)}
                onSetStatus={(status) => setStatus(selected, status)}
                onDelete={() => handleDeleteClick(selected)}
              />
            ) : editForm ? (
              <FormErrorBoundary>
                <LoadEditForm
                  load={selected}
                  editForm={editForm}
                  lumperForm={lumperForm}
                  drivers={drivers}
                  isSubmitting={isSubmitting}
                  onFormChange={handleEditChange}
                  onPickupChange={handlePickupChange}
                  onDeliveryChange={handleDeliveryChange}
                  onLumperCheckboxChange={handleLumperCheckboxChange}
                  onLumperInputChange={handleLumperInputChange}
                  onSubmit={handleEditSubmit}
                  onCancel={() => { setSelected(null); setEditMode(false); setError(""); setShowUploadModal(false); }}
                />
              </FormErrorBoundary>
            ) : null}
          </div>
        </ModalErrorBoundary>
      )}

      {/* Document Upload Modal */}
      {showUploadModal && selected && (
        <ModalErrorBoundary onClose={() => setShowUploadModal(false)}>
          <DocumentUploadModal
            loadId={selected.id}
            loadReferenceId={selected.reference_id}
            onClose={() => setShowUploadModal(false)}
          />
        </ModalErrorBoundary>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && loadToDelete && (
        <ModalErrorBoundary onClose={cancelDelete}>
          <DeleteConfirmationModal
            load={loadToDelete}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
            isDeleting={isSubmitting}
          />
        </ModalErrorBoundary>
      )}
    </div>
  );
} 