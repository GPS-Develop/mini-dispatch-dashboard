"use client";
import { useState } from "react";
import { useDrivers, Driver } from "./DriverContext";
import Button from '../../components/Button/Button';
import { sanitizePhone, formatPhoneForDisplay } from '../../utils/validation';
import CreateDriverAccountModal from "../../components/CreateDriverAccountModal";

type DriverForm = {
  name: string;
  phone: string;
  status: "Available" | "On Load";
  payRate: string; // Keep as string for form input, convert to number when submitting
};

const emptyDriver: DriverForm = {
  name: "",
  phone: "",
  status: "Available",
  payRate: "",
};

export default function DriversPage() {
  const { drivers, addDriver, updateDriver, deleteDriver, reactivateDriver, loading, error: contextError } = useDrivers();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverForm>(emptyDriver);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);

  function openAdd() {
    setForm(emptyDriver);
    setEditId(null);
    setShowForm(true);
    setError("");
  }
  
  function openEdit(driver: Driver) {
    setForm({
      name: driver.name,
      phone: driver.phone.toString(),
      status: driver.status,
      payRate: driver.payRate.toString(),
    });
    setEditId(driver.id);
    setShowForm(true);
    setError("");
  }
  
  function handleChange(e: any) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }
  
  async function handleSubmit(e: any) {
    e.preventDefault();
    
    // Enhanced validation
    if (!form.name || !form.phone || !form.payRate) {
      setError("Name, phone, and pay rate are required.");
      return;
    }
    
    // Sanitize and validate phone number
    const sanitizedPhone = sanitizePhone(form.phone);
    if (!sanitizedPhone || sanitizedPhone.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits).");
      return;
    }
    
    // Validate pay rate is a positive number
    const payRateNum = parseFloat(form.payRate);
    if (isNaN(payRateNum) || payRateNum <= 0) {
      setError("Pay rate must be a positive number greater than 0.");
      return;
    }
    
    const driverData = {
      name: form.name,
      phone: sanitizedPhone,
      status: form.status,
      pay_rate: parseFloat(form.payRate) || 0,
    };
    
    try {
    if (editId) {
      await updateDriver(editId, driverData);
    } else {
      await addDriver(driverData);
    }
    setShowForm(false);
      setForm(emptyDriver);
      setEditId(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }
  
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

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateAccountModal(true)}
            variant="primary"
            className="bg-green-600 hover:bg-green-700"
          >
            + Create Driver Account
          </Button>
          <Button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">+ Add Driver</Button>
        </div>
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
          <div className="text-gray-600">No drivers found. Click "Add Driver" to get started.</div>
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
                <td className="p-2">${d.payRate.toLocaleString()}</td>
                <td className="p-2">{d.scheduledLoads && d.scheduledLoads.length > 0 ? d.scheduledLoads.map(l => `#${l}`).join(", ") : <span className="text-gray-400">-</span>}</td>
                <td className="p-2">{d.inTransitLoads && d.inTransitLoads.length > 0 ? d.inTransitLoads.map(l => `#${l}`).join(", ") : <span className="text-gray-400">-</span>}</td>
                <td className="p-2 flex gap-2">
                  {d.driver_status === "active" && (
                    <>
                  <Button variant="secondary" onClick={() => openEdit(d)} className="text-blue-600 hover:underline">Edit</Button>
                      <Button variant="danger" onClick={() => handleDeleteClick(d)} className="text-red-600 hover:underline">Deactivate</Button>
                    </>
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
      
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editId ? "Edit Driver" : "Add Driver"}</h2>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block font-medium mb-1">Name *</label>
                <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block font-medium mb-1">Phone *</label>
                <input 
                  name="phone" 
                  type="tel"
                  value={form.phone} 
                  onChange={handleChange} 
                  className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                  placeholder="(555) 123-4567"
                />
                <div className="text-xs text-gray-500 mt-1">Enter phone number (formatting will be removed)</div>
              </div>
              <div>
                <label className="block font-medium mb-1">Status *</label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" disabled>
                  <option value="Available">Available</option>
                  <option value="On Load">On Load</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Pay Rate ($) *</label>
                <input 
                  name="payRate" 
                  type="number"
                  min="0"
                  step="1"
                  value={form.payRate} 
                  onChange={handleChange} 
                  className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                  placeholder="500"
                />
                <div className="text-xs text-gray-500 mt-1">Enter pay rate per load in USD as whole number</div>
              </div>
              <div>
                <label className="block font-medium mb-1">Scheduled</label>
                <input value={editId ? (drivers.find(d => d.id === editId)?.scheduledLoads?.map(l => `#${l}`).join(", ") || "-" ) : "-"} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500" disabled />
              </div>
              <div>
                <label className="block font-medium mb-1">In-Transit</label>
                <input value={editId ? (drivers.find(d => d.id === editId)?.inTransitLoads?.map(l => `#${l}`).join(", ") || "-" ) : "-"} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500" disabled />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex gap-2 justify-end mt-4">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</Button>
                <Button type="submit" variant="primary" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700" disabled={loading}>{editId ? "Save" : "Add"}</Button>
              </div>
            </form>
          </div>
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

      {/* Create Driver Account Modal */}
      <CreateDriverAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSuccess={handleCreateAccountSuccess}
      />
    </div>
  );
} 