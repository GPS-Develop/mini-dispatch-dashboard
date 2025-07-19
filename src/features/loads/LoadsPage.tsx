"use client";
import { useState, useEffect } from "react";
import { useLoads, Load } from "./LoadContext";
import { useDrivers } from "../../features/drivers/DriverContext";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import DocumentUploadModal from '../../components/DocumentUploadModal/DocumentUploadModal';
import { EmptyLoads } from '../../components/EmptyState/EmptyState';
import { LumperServiceForm, InputChangeEvent, SelectChangeEvent, TextareaChangeEvent, FormSubmitEvent } from '../../types';
import { LoadFilters } from './components/LoadFilters';
import { LoadCard } from './components/LoadCard';
import { LoadDetailsModal } from './components/LoadDetailsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { LoadEditModal } from './components/LoadEditModal';
import { LoadEditForm } from './components/LoadEditForm';
import ModalErrorBoundary from '../../components/ErrorBoundary/ModalErrorBoundary';
import { useLoadData } from './hooks/useLoadData';
import { useLoadFiltering } from './hooks/useLoadFiltering';
import { useLoadActions } from './hooks/useLoadActions';
import { useDriverStatus } from '../../hooks/useDriverStatus';


export default function LoadsPage() {
  const { loads, error: loadError } = useLoads();
  const { drivers: rawDrivers } = useDrivers();
  const { driversWithStatus: drivers } = useDriverStatus(rawDrivers, loads);
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Load | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<LoadEditForm | null>(null);
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState<Load | null>(null);
  
  // Custom hooks
  const { pickupsMap, deliveriesMap, lumperMap, error: dataError, setError, fetchAllPickupsDeliveries } = useLoadData();
  const { filteredLoads } = useLoadFiltering({
    loads,
    drivers,
    pickupsMap,
    deliveriesMap,
    lumperMap,
    statusFilter,
    driverFilter,
    search
  });
  const { error: actionError, isSubmitting, handleStatusUpdate, handleLoadDelete, handleLoadEdit } = useLoadActions();

  const router = useRouter();
  const supabase = createClient();
  
  // Combine all errors
  const error = loadError || dataError || actionError;


  useEffect(() => {
    if (selected && editMode) {
      const fetchLumperForEdit = async () => {
        try {
          // Fetch lumper service for this specific load
          const { data: lumperService } = await supabase
            .from('lumper_services')
            .select('*')
            .eq('load_id', selected.id)
            .maybeSingle();

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


  function getDriverName(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return "Unknown";
    if (driver.driver_status !== "active") {
      return `${driver.name} (${driver.driver_status.charAt(0).toUpperCase() + driver.driver_status.slice(1)})`;
    }
    return driver.name;
  }

  async function setStatus(load: Load, status: "Scheduled" | "In-Transit" | "Delivered") {
    try {
      await handleStatusUpdate(load, status);
      setSelected(null);
    } catch {
      // Error is already handled in the hook
    }
  }

  function handleDeleteClick(load: Load) {
    setLoadToDelete(load);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!loadToDelete) return;
    
    try {
      await handleLoadDelete(loadToDelete.id);
      setSelected(null);
      setShowDeleteConfirm(false);
      setLoadToDelete(null);
    } catch {
      // Error is already handled in the hook
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
    
    try {
      await handleLoadEdit(selected, editForm, lumperForm, lumperMap, fetchAllPickupsDeliveries);
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
    } catch {
      // Error is already handled in the hook
    }
  }

  return (
    <div className="page-container-xl">
      <div className="page-header">
        <h1 className="heading-xl">Loads</h1>
      </div>
      
      {error && (
        <div className="alert-error">
          {error}
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
              <LoadEditModal
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