"use client";
import { useState } from "react";
import { useDrivers, Driver } from "./DriverContext";
import Button from '../../components/Button/Button';
import { formatPhoneForDisplay, formatDriverPayRateForDisplay } from '../../utils/validation';
import CreateDriverAccountModal from "../../components/CreateDriverAccountModal";

export default function DriversPage() {
  const { drivers, deleteDriver, reactivateDriver, updateDriver, loading, error: contextError } = useDrivers();

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
    <div className="max-w-3xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Button 
          onClick={() => setShowCreateAccountModal(true)}
          variant="primary"
          className="bg-green-600 hover:bg-green-700"
        >
          + Create Driver Account
        </Button>
      </div>
      {(error || contextError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error || contextError}
        </div>
      )}
      
      {loading && (
        <div className="text-center py-8">
          <div className="text-gray-600">Loading drivers...</div>
        </div>
      )}
      
      {!loading && drivers.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-600">No drivers found. Click "Create Driver Account" to get started.</div>
        </div>
      )}
      
      {!loading && drivers.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-left border border-gray-200 bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-semibold">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Status</th>
              <th className="p-2">Driver Status</th>
              <th className="p-2">Pay Rate</th>
              <th className="p-2">Scheduled</th>
              <th className="p-2">In-Transit</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t border-gray-200 bg-white text-gray-900">
                <td className="p-2">{d.name}</td>
                <td className="p-2">{d.email ? d.email : <span className="text-gray-400">No email</span>}</td>
                <td className="p-2">{formatPhoneForDisplay(d.phone)}</td>
                <td className="p-2">
                  <span className={
                    d.status === "Available"
                      ? "text-green-600 font-semibold"
                      : "text-yellow-700 font-semibold"
                  }>
                    {d.status}
                  </span>
                </td>
                <td className="p-2">
                  <span className={
                    d.driver_status === "active"
                      ? "text-green-600 font-semibold"
                      : "text-gray-400 font-semibold"
                  }>
                    {d.driver_status.charAt(0).toUpperCase() + d.driver_status.slice(1)}
                  </span>
                </td>
                <td className="p-2">${formatDriverPayRateForDisplay(d.payRate)}</td>
                <td className="p-2">{d.scheduledLoads && d.scheduledLoads.length > 0 ? d.scheduledLoads.map(l => `#${l}`).join(", ") : <span className="text-gray-400">-</span>}</td>
                <td className="p-2">{d.inTransitLoads && d.inTransitLoads.length > 0 ? d.inTransitLoads.map(l => `#${l}`).join(", ") : <span className="text-gray-400">-</span>}</td>
                <td className="p-2 flex gap-2">
                  <Button variant="secondary" onClick={() => handleEditClick(d)} className="text-blue-600 hover:underline">Edit</Button>
                  {d.driver_status === "active" && (
                    <Button variant="danger" onClick={() => handleDeleteClick(d)} className="text-red-600 hover:underline">Deactivate</Button>
                  )}
                  {d.driver_status === "inactive" && (
                    <Button variant="primary" onClick={() => handleReactivate(d.id)} className="text-green-600 hover:underline">Reactivate</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && driverToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Confirm Deactivation</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to deactivate <strong>{driverToDelete.name}</strong>?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This will set the driver status to inactive. The driver can be reactivated later if needed.
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
                Deactivate Driver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && driverToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Driver</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditFormChange}
                  required
                  placeholder="(555) 123-4567"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={driverToEdit.email || ''}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                                 <p className="text-xs text-gray-500 mt-1">
                   Email cannot be changed as it&apos;s used for account setup
                 </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
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