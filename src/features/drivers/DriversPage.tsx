"use client";
import { useState } from "react";
import { useDrivers, Driver } from "./DriverContext";
import { useLoads } from '../loads/LoadContext';
import { useDriverStatus } from '../../hooks/useDriverStatus';
import Button from '../../components/Button/Button';
import { formatPhoneForDisplay, formatDriverPayRateForDisplay } from '../../utils/validation';
import CreateDriverAccountModal from "../../components/CreateDriverAccountModal";
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { EmptyDrivers } from '../../components/EmptyState/EmptyState';

export default function DriversPage() {
  const { drivers: rawDrivers, deleteDriver, reactivateDriver, updateDriver, loading, error: contextError } = useDrivers();
  const { loads } = useLoads();
  const { driversWithStatus: drivers } = useDriverStatus(rawDrivers, loads);

  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    payRate: 0
  });


  
  function handleDeleteClick(driver: Driver) {
    setDriverToDelete(driver);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!driverToDelete) return;
    
      try {
      await deleteDriver(driverToDelete.id);
      setShowDeleteConfirm(false);
      setDriverToDelete(null);
      setError("");
      } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate driver';
        setError(errorMessage);
      setShowDeleteConfirm(false);
      setDriverToDelete(null);
        
        // If it's a foreign key constraint error, provide more helpful guidance
        if (errorMessage.includes("currently on load")) {
          // The error message is already user-friendly from the context
          // Just make sure it's displayed prominently
        }
      }
    }

  function cancelDelete() {
    setShowDeleteConfirm(false);
    setDriverToDelete(null);
  }

  async function handleReactivate(id: string) {
    await reactivateDriver(id);
    setError("");
  }

  const handleCreateAccountSuccess = () => {
    // The drivers list will automatically refresh due to the context
    // You might want to show a success message here
  };

  function handleEditClick(driver: Driver) {
    setDriverToEdit(driver);
    setEditForm({
      name: driver.name,
      phone: String(driver.phone),
      payRate: driver.payRate
    });
    setShowEditModal(true);
  }

  function handleEditFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'payRate' ? parseFloat(value) || 0 : value
    }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverToEdit) return;

    try {
      await updateDriver(driverToEdit.id, {
        name: editForm.name,
        phone: editForm.phone.replace(/\D/g, ''),
        pay_rate: editForm.payRate
      });
      setShowEditModal(false);
      setDriverToEdit(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update driver');
    }
  }

  function cancelEdit() {
    setShowEditModal(false);
    setDriverToEdit(null);
  }

  return (
    <div className="page-container-xl">
      <div className="page-header">
        <h1 className="heading-xl">Drivers</h1>
        <Button 
          onClick={() => setShowCreateAccountModal(true)}
          variant="primary"
        >
          + Create Driver Account
        </Button>
      </div>
      {(error || contextError) && (
        <div className="alert-error">
          {error || contextError}
        </div>
      )}
      
      {loading && (
        <SkeletonTable rows={5} columns={8} />
      )}
      
      {!loading && drivers.length === 0 && (
        <EmptyDrivers onCreateDriver={() => setShowCreateAccountModal(true)} />
      )}
      
      {!loading && drivers.length > 0 && (
      <>
        {/* Desktop Table View */}
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell-name">Name</th>
                <th className="table-cell-email">Email</th>
                <th className="table-cell-phone">Phone</th>
                <th className="table-cell-compact">Status</th>
                <th className="table-cell-compact">Driver Status</th>
                <th className="table-cell-compact">Pay Rate</th>
                <th className="table-cell-loads">Scheduled</th>
                <th className="table-cell-loads">In-Transit</th>
                <th className="table-cell-actions">Actions</th>
              </tr>
            </thead>
                        <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="table-row-hover">
                    <td className="table-cell-name">{d.name}</td>
                    <td className="table-cell-email">{d.email ? d.email : <span className="text-muted">None</span>}</td>
                    <td className="table-cell-phone">{formatPhoneForDisplay(d.phone)}</td>
                    <td className="table-cell-compact">
                      <span className={
                        d.status === "Available"
                          ? "status-success"
                          : "status-warning"
                      }>
                        {d.status}
                      </span>
                    </td>
                    <td className="table-cell-compact">
                      <span className={
                        d.driver_status === "active"
                          ? "status-success"
                          : "status-error"
                      }>
                        {d.driver_status.charAt(0).toUpperCase() + d.driver_status.slice(1)}
                      </span>
                    </td>
                    <td className="table-cell-compact">${formatDriverPayRateForDisplay(d.payRate)}</td>
                    <td className="table-cell-loads">
                      <span className="loads-count">
                        {d.scheduledLoads && d.scheduledLoads.length > 0 ? d.scheduledLoads.length : 0}
                      </span>
                    </td>
                    <td className="table-cell-loads">
                      <span className="loads-count">
                        {d.inTransitLoads && d.inTransitLoads.length > 0 ? d.inTransitLoads.length : 0}
                      </span>
                    </td>
                    <td className="table-cell-actions">
                      <div className="button-group-horizontal">
                        <Button variant="secondary" onClick={() => handleEditClick(d)}>Edit</Button>
                        {d.driver_status === "active" && (
                          <Button variant="danger" onClick={() => handleDeleteClick(d)}>Deactivate</Button>
                        )}
                        {d.driver_status === "inactive" && (
                          <Button variant="success" onClick={() => handleReactivate(d.id)}>Reactivate</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
        
        {/* Mobile Card View */}
        <div className="driver-cards">
          {drivers.map((d) => (
            <div key={d.id} className="driver-card">
              <div className="driver-card-header">
                <div className="driver-card-name">{d.name}</div>
                <div className="driver-card-status">
                  <span className={
                    d.status === "Available"
                      ? "status-success"
                      : "status-warning"
                  }>
                    {d.status}
                  </span>
                  <span className={
                    d.driver_status === "active"
                      ? "status-success"
                      : "status-error"
                  }>
                    {d.driver_status.charAt(0).toUpperCase() + d.driver_status.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="driver-card-details">
                <div className="driver-card-detail">
                  <div className="driver-card-detail-label">Email</div>
                  <div className="driver-card-detail-value">
                    {d.email ? d.email : <span className="text-muted">No email</span>}
                  </div>
                </div>
                <div className="driver-card-detail">
                  <div className="driver-card-detail-label">Phone</div>
                  <div className="driver-card-detail-value">{formatPhoneForDisplay(d.phone)}</div>
                </div>
                <div className="driver-card-detail">
                  <div className="driver-card-detail-label">Pay Rate</div>
                  <div className="driver-card-detail-value">${formatDriverPayRateForDisplay(d.payRate)}</div>
                </div>
              </div>
              
              <div className="driver-card-loads">
                <div className="driver-card-loads-title">Current Loads</div>
                <div className="driver-card-loads-content">
                  <div>
                    <span className="driver-card-detail-label">Scheduled: </span>
                    <span className="driver-card-detail-value">
                      {d.scheduledLoads && d.scheduledLoads.length > 0 ? 
                        d.scheduledLoads.map(l => `#${l}`).join(", ") : 
                        <span className="text-muted">-</span>
                      }
                    </span>
                  </div>
                  <div>
                    <span className="driver-card-detail-label">In-Transit: </span>
                    <span className="driver-card-detail-value">
                      {d.inTransitLoads && d.inTransitLoads.length > 0 ? 
                        d.inTransitLoads.map(l => `#${l}`).join(", ") : 
                        <span className="text-muted">-</span>
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="driver-card-actions">
                <Button variant="secondary" onClick={() => handleEditClick(d)}>Edit</Button>
                {d.driver_status === "active" && (
                  <Button variant="danger" onClick={() => handleDeleteClick(d)}>Deactivate</Button>
                )}
                {d.driver_status === "inactive" && (
                  <Button variant="success" onClick={() => handleReactivate(d.id)}>Reactivate</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
      )}
      


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && driverToDelete && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="heading-md text-error">⚠️ Confirm Deactivation</h2>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Are you sure you want to deactivate <strong>{driverToDelete.name}</strong>?
              </p>
              <p className="text-hint">
                This will set the driver status to inactive. The driver can be reactivated later if needed.
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
                  Deactivate Driver
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && driverToEdit && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="heading-md">Edit Driver</h2>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit} className="form-container">
                <div className="edit-form-section">
                  <label className="label-text">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    required
                    className="input-field"
                  />
                </div>
                
                <div className="edit-form-section">
                  <label className="label-text">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditFormChange}
                    required
                    placeholder="(555) 123-4567"
                    className="input-field"
                  />
                </div>

                <div className="edit-form-section">
                  <label className="label-text">
                    Pay Rate ($/mile) *
                  </label>
                  <input
                    type="number"
                    name="payRate"
                    value={editForm.payRate}
                    onChange={handleEditFormChange}
                    required
                    min="0"
                    step="0.01"
                    className="input-field"
                  />
                </div>

                <div className="edit-form-section">
                  <label className="label-text">
                    Email
                  </label>
                  <input
                    type="email"
                    value={driverToEdit.email || ''}
                    disabled
                    className="input-field"
                  />
                  <p className="text-hint">
                    Email cannot be changed as it&apos;s used for account setup
                  </p>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <div className="button-group-horizontal">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  onClick={handleEditSubmit}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Driver Account Modal */}
      <CreateDriverAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSuccess={handleCreateAccountSuccess}
      />
    </div>
  );
} 