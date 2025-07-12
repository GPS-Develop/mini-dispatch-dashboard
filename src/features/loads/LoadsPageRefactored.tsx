"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from '../../hooks/useAppData';
import { useLoadOperations } from '../../hooks/useLoadOperations';
import { Load } from './LoadContext';
import { sanitizePhone } from '../../utils/validation';
import DocumentUploadModal from '../../components/DocumentUploadModal/DocumentUploadModal';
import { EmptyLoads } from '../../components/EmptyState/EmptyState';
import { Pickup, Delivery, InputChangeEvent, SelectChangeEvent, TextareaChangeEvent, FormSubmitEvent } from '../../types';
import { LoadFilters } from './components/LoadFilters';
import { LoadCard } from './components/LoadCard';
import { LoadDetailsModal } from './components/LoadDetailsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { LoadEditForm } from './components/LoadEditForm';
import ModalErrorBoundary from '../../components/ErrorBoundary/ModalErrorBoundary';
import FormErrorBoundary from '../../components/ErrorBoundary/FormErrorBoundary';

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

export default function LoadsPageRefactored() {
  const router = useRouter();
  const { loads, drivers, getDriverName, ui } = useAppData();
  const loadOps = useLoadOperations();
  
  // Local filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("");
  const [search, setSearch] = useState("");
  
  // Data states
  const [pickupsMap, setPickupsMap] = useState<Record<string, Pickup[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [editForm, setEditForm] = useState<LoadEditForm | null>(null);

  // UI states using context
  const selected = loadOps.getSelectedLoad();
  const isEditMode = ui.isModalOpen('editLoad');
  const isUploadModalOpen = ui.isModalOpen('uploadDocuments');
  const loadToDelete = ui.getSelected('loadToDelete') as Load | null;
  const isDeleteConfirmOpen = loadToDelete ? ui.isModalOpen(`delete-${loadToDelete.id}`) : false;

  const filteredLoads = useMemo(() => {
    return loads.loads.filter((l) => {
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
      const driver = drivers.drivers.find((d) => d.id === l.driver_id);
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
  }, [loads.loads, pickupsMap, deliveriesMap, statusFilter, driverFilter, search, drivers.drivers]);

  // Fetch pickups and deliveries when loads change
  useEffect(() => {
    const fetchData = async () => {
      if (loads.loads.length === 0) return;
      const loadIds = loads.loads.map(l => l.id);
      const { pickups, deliveries } = await loadOps.fetchPickupsDeliveries(loadIds);
      setPickupsMap(pickups);
      setDeliveriesMap(deliveries);
    };
    fetchData();
  }, [loads.loads, loadOps]);

  // Update edit form when selected load or edit mode changes
  useEffect(() => {
    if (selected && isEditMode) {
      setEditForm({
        ...selected,
        pickups: pickupsMap[selected.id] ? pickupsMap[selected.id].map(p => ({ ...p })) : [],
        deliveries: deliveriesMap[selected.id] ? deliveriesMap[selected.id].map(d => ({ ...d })) : [],
      });
    }
  }, [selected, isEditMode, pickupsMap, deliveriesMap]);

  // Event handlers
  const handleLoadSelect = (load: Load) => {
    loadOps.selectLoad(load);
  };

  const handleEditLoad = () => {
    ui.openModal('editLoad');
  };

  const handleUploadDocuments = () => {
    ui.openModal('uploadDocuments');
  };

  const handleDeleteLoad = (load: Load) => {
    loadOps.openDeleteConfirmation(load);
  };

  const handleConfirmDelete = async () => {
    if (loadToDelete) {
      await loadOps.deleteLoadWithConfirmation(loadToDelete);
    }
  };

  const handleCancelDelete = () => {
    if (loadToDelete) {
      loadOps.closeDeleteConfirmation(loadToDelete);
    }
  };

  const handleCloseModals = () => {
    loadOps.clearSelectedLoad();
    ui.closeModal('editLoad');
    ui.closeModal('uploadDocuments');
    ui.clearError('loadOperations');
  };

  const handlePickupChange = (idx: number, e: InputChangeEvent | SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditForm((prev: LoadEditForm | null) => {
      if (!prev) return null;
      const pickups = [...prev.pickups];
      pickups[idx] = { ...pickups[idx], [name]: value };
      return { ...prev, pickups };
    });
  };

  const handleDeliveryChange = (idx: number, e: InputChangeEvent | SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditForm((prev: LoadEditForm | null) => {
      if (!prev) return null;
      const deliveries = [...prev.deliveries];
      deliveries[idx] = { ...deliveries[idx], [name]: value };
      return { ...prev, deliveries };
    });
  };

  const handleEditChange = (e: InputChangeEvent | SelectChangeEvent | TextareaChangeEvent) => {
    const { name, value } = e.target;
    setEditForm((prev: LoadEditForm | null) => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };

  const handleEditSubmit = async (e: FormSubmitEvent) => {
    e.preventDefault();
    if (!selected || !editForm) return;
    
    ui.setLoading('editLoad', true);
    ui.clearError('loadOperations');
    
    // Validate broker contact before submission
    const brokerContactStr = typeof editForm.broker_contact === 'number' ? 
      editForm.broker_contact.toString() : 
      editForm.broker_contact || '';
    const sanitizedBrokerContact = sanitizePhone(brokerContactStr);
    if (!sanitizedBrokerContact || sanitizedBrokerContact.length < 10) {
      ui.setError('loadOperations', "Broker contact must be a valid phone number");
      ui.setLoading('editLoad', false);
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
      await loads.updateLoad(selected.id, updatedData);
      
      // Refresh pickup/delivery data
      const loadIds = loads.loads.map(l => l.id);
      const { pickups, deliveries } = await loadOps.fetchPickupsDeliveries(loadIds);
      setPickupsMap(pickups);
      setDeliveriesMap(deliveries);
      
      loadOps.closeEditMode();
      loadOps.clearSelectedLoad();
      setEditForm(null);
    } catch (err) {
      ui.setError('loadOperations', err instanceof Error ? err.message : 'Failed to update load');
    } finally {
      ui.setLoading('editLoad', false);
    }
  };

  return (
    <div className="page-container-xl">
      <div className="page-header">
        <h1 className="heading-xl">Loads</h1>
      </div>
      
      {(loadOps.operationError || loads.error) && (
        <div className="alert-error">
          {loadOps.operationError || loads.error}
        </div>
      )}
      
      <LoadFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        driverFilter={driverFilter}
        setDriverFilter={setDriverFilter}
        drivers={drivers.drivers}
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
              onClick={() => handleLoadSelect(load)}
            />
          ))
        )}
      </div>
      
      {/* Modal for load details */}
      {selected && (
        <ModalErrorBoundary onClose={handleCloseModals}>
          <div className="modal-overlay" onClick={handleCloseModals}>
            {!isEditMode ? (
              <LoadDetailsModal
                load={selected}
                pickups={pickupsMap[selected.id] || []}
                deliveries={deliveriesMap[selected.id] || []}
                getDriverName={getDriverName}
                onClose={handleCloseModals}
                onEdit={handleEditLoad}
                onUploadDocuments={handleUploadDocuments}
                onSetStatus={(status) => loadOps.updateLoadStatus(selected, status)}
                onDelete={() => handleDeleteLoad(selected)}
              />
            ) : editForm ? (
              <FormErrorBoundary>
                <LoadEditForm
                  load={selected}
                  editForm={editForm}
                  drivers={drivers.drivers}
                  isSubmitting={ui.isLoading('editLoad')}
                  onFormChange={handleEditChange}
                  onPickupChange={handlePickupChange}
                  onDeliveryChange={handleDeliveryChange}
                  onSubmit={handleEditSubmit}
                  onCancel={handleCloseModals}
                />
              </FormErrorBoundary>
            ) : null}
          </div>
        </ModalErrorBoundary>
      )}

      {/* Document Upload Modal */}
      {isUploadModalOpen && selected && (
        <ModalErrorBoundary onClose={() => ui.closeModal('uploadDocuments')}>
          <DocumentUploadModal
            loadId={selected.id}
            loadReferenceId={selected.reference_id}
            onClose={() => ui.closeModal('uploadDocuments')}
          />
        </ModalErrorBoundary>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && loadToDelete && (
        <ModalErrorBoundary onClose={handleCancelDelete}>
          <DeleteConfirmationModal
            load={loadToDelete}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            isDeleting={loadOps.isLoadBeingDeleted(loadToDelete.id)}
          />
        </ModalErrorBoundary>
      )}
    </div>
  );
}