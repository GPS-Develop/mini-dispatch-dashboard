"use client";
import { useState, useEffect } from "react";
import { useDrivers } from "../drivers/DriverContext";
import { useLoads } from "../loads/LoadContext";

export default function AddLoadPage() {
  const { drivers } = useDrivers();
  const { addLoad, error: loadError, loading: loadLoading } = useLoads();
  const [form, setForm] = useState({
    referenceId: "",
    pickupLocation: "",
    pickupDateTime: "",
    deliveryLocation: "",
    deliveryDateTime: "",
    loadType: "Reefer",
    temperature: "",
    rate: "",
    driver: "",
    notes: "",
    brokerName: "",
    brokerContact: "",
    brokerEmail: "",
  });
  const [showTemp, setShowTemp] = useState(true);
  const [errors, setErrors] = useState<any>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setShowTemp(form.loadType === "Reefer");
  }, [form.loadType]);

  function handleChange(e: any) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const newErrors: any = {};
    if (!form.referenceId) newErrors.referenceId = "Required";
    if (!form.pickupLocation) newErrors.pickupLocation = "Required";
    if (!form.pickupDateTime) newErrors.pickupDateTime = "Required";
    if (!form.deliveryLocation) newErrors.deliveryLocation = "Required";
    if (!form.deliveryDateTime) newErrors.deliveryDateTime = "Required";
    if (!form.loadType) newErrors.loadType = "Required";
    if (form.loadType === "Reefer" && !form.temperature) newErrors.temperature = "Required";
    if (!form.rate) newErrors.rate = "Required";
    if (!form.driver) newErrors.driver = "Required";
    if (!form.brokerName) newErrors.brokerName = "Required";
    if (!form.brokerContact) newErrors.brokerContact = "Required";
    if (!form.brokerEmail) newErrors.brokerEmail = "Required";
    return newErrors;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      const driverObj = drivers.find((d) => d.name === form.driver);
      const driverId = driverObj ? driverObj.id : "";
      await addLoad({
        reference_id: form.referenceId,
        pickup_location: form.pickupLocation,
        pickup_datetime: form.pickupDateTime,
        delivery_location: form.deliveryLocation,
        delivery_datetime: form.deliveryDateTime,
        load_type: form.loadType,
        temperature: form.temperature,
        rate: form.rate,
        driver_id: driverId,
        notes: form.notes,
        broker_name: form.brokerName,
        broker_contact: form.brokerContact,
        broker_email: form.brokerEmail,
        status: "Scheduled",
      });
      if (!loadError) {
        setSuccess(true);
        setForm({
          referenceId: "",
          pickupLocation: "",
          pickupDateTime: "",
          deliveryLocation: "",
          deliveryDateTime: "",
          loadType: "Reefer",
          temperature: "",
          rate: "",
          driver: "",
          notes: "",
          brokerName: "",
          brokerContact: "",
          brokerEmail: "",
        });
        setTimeout(() => setSuccess(false), 2000);
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white text-gray-900 rounded-xl shadow-lg p-6 mt-8 mb-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Add Load</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium mb-1">Load Reference ID *</label>
          <input name="referenceId" value={form.referenceId} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
          {errors.referenceId && <div className="text-red-500 text-sm">{errors.referenceId}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Pickup Location *</label>
          <input name="pickupLocation" value={form.pickupLocation} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
          {errors.pickupLocation && <div className="text-red-500 text-sm">{errors.pickupLocation}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Pickup Date & Time *</label>
          <input type="datetime-local" name="pickupDateTime" value={form.pickupDateTime} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
          {errors.pickupDateTime && <div className="text-red-500 text-sm">{errors.pickupDateTime}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Delivery Location *</label>
          <input name="deliveryLocation" value={form.deliveryLocation} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
          {errors.deliveryLocation && <div className="text-red-500 text-sm">{errors.deliveryLocation}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Delivery Date & Time *</label>
          <input type="datetime-local" name="deliveryDateTime" value={form.deliveryDateTime} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
          {errors.deliveryDateTime && <div className="text-red-500 text-sm">{errors.deliveryDateTime}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Load Type *</label>
          <select name="loadType" value={form.loadType} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900">
            <option value="Reefer">Reefer</option>
            <option value="Dry Van">Dry Van</option>
            <option value="Flatbed">Flatbed</option>
          </select>
          {errors.loadType && <div className="text-red-500 text-sm">{errors.loadType}</div>}
        </div>
        {showTemp && (
          <div>
            <label className="block font-medium mb-1">Temperature Requirement (°C) *</label>
            <input name="temperature" value={form.temperature} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
            {errors.temperature && <div className="text-red-500 text-sm">{errors.temperature}</div>}
          </div>
        )}
        <div>
          <label className="block font-medium mb-1">Rate *</label>
          <input name="rate" value={form.rate} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
          {errors.rate && <div className="text-red-500 text-sm">{errors.rate}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Driver *</label>
          {drivers.length === 0 ? (
            <div className="text-red-500 text-sm mb-2">No drivers available. Please add a driver first.</div>
          ) : null}
          <select
            name="driver"
            value={form.driver}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 bg-white text-gray-900"
            disabled={drivers.length === 0}
          >
            <option value="">Select driver</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          {errors.driver && <div className="text-red-500 text-sm">{errors.driver}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Dispatcher Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" rows={2} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block font-medium mb-1">Broker Name *</label>
            <input name="brokerName" value={form.brokerName} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
            {errors.brokerName && <div className="text-red-500 text-sm">{errors.brokerName}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Broker Contact *</label>
            <input name="brokerContact" value={form.brokerContact} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
            {errors.brokerContact && <div className="text-red-500 text-sm">{errors.brokerContact}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Broker Email *</label>
            <input name="brokerEmail" value={form.brokerEmail} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
            {errors.brokerEmail && <div className="text-red-500 text-sm">{errors.brokerEmail}</div>}
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition"
          disabled={drivers.length === 0 || loadLoading}
        >
          {loadLoading ? "Submitting..." : "Submit"}
        </button>
        {loadError && <div className="text-red-600 text-center font-medium mt-2">{loadError}</div>}
        {success && <div className="text-green-600 text-center font-medium mt-2">Load added successfully!</div>}
      </form>
    </div>
  );
} 