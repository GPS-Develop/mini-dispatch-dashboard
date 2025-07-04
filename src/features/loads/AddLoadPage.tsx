"use client";
import { useState, useEffect } from "react";
import { useDrivers } from "../../features/drivers/DriverContext";
import { useLoads } from "../../features/loads/LoadContext";
import { useRouter } from "next/navigation";
import Button from '../../components/Button/Button';
import { sanitizePhone, validateRate } from '../../utils/validation';

export default function AddLoadPage() {
  const { drivers } = useDrivers();
  const { addFullLoad, error: loadError, loading: loadLoading } = useLoads();
  const router = useRouter();
  const US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
  ];
  const [form, setForm] = useState({
    referenceId: "",
    pickups: [
      { address: "", city: "", state: "", datetime: "" }
    ],
    deliveries: [
      { address: "", city: "", state: "", datetime: "" }
    ],
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

  function handlePickupChange(idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target as { name: 'address' | 'city' | 'state' | 'datetime'; value: string };
    setForm((prev) => {
      const pickups = [...prev.pickups];
      pickups[idx][name] = value;
      return { ...prev, pickups };
    });
  }

  function handleDeliveryChange(idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target as { name: 'address' | 'city' | 'state' | 'datetime'; value: string };
    setForm((prev) => {
      const deliveries = [...prev.deliveries];
      deliveries[idx][name] = value;
      return { ...prev, deliveries };
    });
  }

  function addPickup() {
    setForm((prev) => ({ ...prev, pickups: [...prev.pickups, { address: "", city: "", state: "", datetime: "" }] }));
  }

  function removePickup(idx: number) {
    setForm((prev) => ({ ...prev, pickups: prev.pickups.filter((_, i) => i !== idx) }));
  }

  function addDelivery() {
    setForm((prev) => ({ ...prev, deliveries: [...prev.deliveries, { address: "", city: "", state: "", datetime: "" }] }));
  }

  function removeDelivery(idx: number) {
    setForm((prev) => ({ ...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx) }));
  }

  function validate() {
    const newErrors: any = {};
    if (!form.referenceId) newErrors.referenceId = "Required";
    if (form.pickups.length === 0) newErrors.pickups = "At least one pickup required";
    if (form.deliveries.length === 0) newErrors.deliveries = "At least one delivery required";
    if (!form.loadType) newErrors.loadType = "Required";
    if (form.loadType === "Reefer" && (!form.temperature || isNaN(parseFloat(form.temperature)))) {
      newErrors.temperature = "Temperature is required for reefer loads";
    }
    // Use the validateRate function for consistent validation
    const rateValidation = validateRate(form.rate);
    if (!rateValidation.isValid) {
      newErrors.rate = rateValidation.error || "Invalid rate";
    }
    if (!form.driver) newErrors.driver = "Required";
    if (!form.brokerName) newErrors.brokerName = "Required";
    
    // Updated broker contact validation
    if (!form.brokerContact) {
      newErrors.brokerContact = "Broker contact is required";
    } else {
      const sanitizedPhone = sanitizePhone(form.brokerContact);
      if (!sanitizedPhone || sanitizedPhone.length < 10) {
        newErrors.brokerContact = "Broker contact must be a valid phone number (at least 10 digits)";
      }
    }
    
    if (!form.brokerEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(form.brokerEmail)) newErrors.brokerEmail = "Valid email required";
    return newErrors;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      const driverObj = drivers.find((d) => d.name === form.driver);
      const driverId = driverObj ? driverObj.id : "";
      
      // Use validated rate value to ensure it's an integer
      const rateValidation = validateRate(form.rate);
      const validatedRate = rateValidation.isValid ? rateValidation.sanitizedValue : 0;
      
      const loadData = {
        reference_id: form.referenceId,
        load_type: form.loadType,
        temperature: form.temperature === "" ? null : parseFloat(form.temperature),
        rate: validatedRate, // Use validated integer value
        driver_id: driverId,
        notes: form.notes,
        broker_name: form.brokerName,
        broker_contact: parseInt(sanitizePhone(form.brokerContact)) || 0, // Sanitize and convert to number
        broker_email: form.brokerEmail,
        status: "Scheduled",
      };
      await addFullLoad(loadData, form.pickups, form.deliveries);
      router.push("/loads");
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white text-gray-900 rounded-xl shadow-lg p-6 mt-8 mb-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Add Load</h1>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium mb-1">Load Reference ID *</label>
          <input name="referenceId" value={form.referenceId} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
          {errors.referenceId && <div className="text-red-500 text-sm">{errors.referenceId}</div>}
        </div>
        <div>
          <label className="block font-medium mb-2">Pickups *</label>
          <div className="flex flex-col gap-3">
            {form.pickups.map((pickup, idx) => (
              <div
                key={idx}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm px-4 py-3 flex items-center gap-2 relative hover:shadow-md transition-all"
              >
                <input
                  name="address"
                  placeholder="Address"
                  value={pickup.address}
                  onChange={e => handlePickupChange(idx, e)}
                  className="flex-1 border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <input
                  name="city"
                  placeholder="City"
                  value={pickup.city}
                  onChange={e => handlePickupChange(idx, e)}
                  className="border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-32"
                />
                <select
                  name="state"
                  value={pickup.state}
                  onChange={e => handlePickupChange(idx, e)}
                  className="border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  name="datetime"
                  value={pickup.datetime}
                  onChange={e => handlePickupChange(idx, e)}
                  className="border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => removePickup(idx)}
                  className="ml-2 flex items-center justify-center w-8 h-8 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Remove Pickup"
                  tabIndex={0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <Button type="button" onClick={addPickup} className="flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition w-fit">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Pickup
            </Button>
          </div>
        </div>
        <div>
          <label className="block font-medium mb-2">Deliveries *</label>
          <div className="flex flex-col gap-3">
            {form.deliveries.map((delivery, idx) => (
              <div
                key={idx}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm px-4 py-3 flex items-center gap-2 relative hover:shadow-md transition-all"
              >
                <input
                  name="address"
                  placeholder="Address"
                  value={delivery.address}
                  onChange={e => handleDeliveryChange(idx, e)}
                  className="flex-1 border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <input
                  name="city"
                  placeholder="City"
                  value={delivery.city}
                  onChange={e => handleDeliveryChange(idx, e)}
                  className="border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-32"
                />
                <select
                  name="state"
                  value={delivery.state}
                  onChange={e => handleDeliveryChange(idx, e)}
                  className="border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  name="datetime"
                  value={delivery.datetime}
                  onChange={e => handleDeliveryChange(idx, e)}
                  className="border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => removeDelivery(idx)}
                  className="ml-2 flex items-center justify-center w-8 h-8 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Remove Delivery"
                  tabIndex={0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <Button type="button" onClick={addDelivery} className="flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-lg transition w-fit">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Delivery
            </Button>
          </div>
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
            <label className="block font-medium mb-1">Temperature (°F) *</label>
            <input 
              name="temperature" 
              type="number"
              step="0.1"
              min="-100"
              max="200"
              value={form.temperature} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2 bg-white text-gray-900"
              placeholder="e.g., -10, 35, 72"
            />
            <div className="text-xs text-gray-500 mt-1">Enter temperature in Fahrenheit (range: -100°F to 200°F)</div>
            {errors.temperature && <div className="text-red-500 text-sm">{errors.temperature}</div>}
          </div>
        )}
        <div>
          <label className="block font-medium mb-1">Rate ($) *</label>
          <input 
            name="rate" 
            type="number"
            min="0"
            step="1"
            value={form.rate} 
            onChange={handleChange} 
            className="w-full border rounded px-3 py-2 bg-white text-gray-900"
            placeholder="2500"
          />
          <div className="text-xs text-gray-500 mt-1">Enter rate in USD as whole number (e.g., 2500)</div>
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
            {drivers.filter(d => d.driver_status === "active").map((d) => (
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
            <input 
              name="brokerContact" 
              type="tel"
              value={form.brokerContact} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2 bg-white text-gray-900"
              placeholder="(555) 123-4567"
            />
            <div className="text-xs text-gray-500 mt-1">Enter phone number (formatting will be removed)</div>
            {errors.brokerContact && <div className="text-red-500 text-sm">{errors.brokerContact}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Broker Email *</label>
            <input name="brokerEmail" value={form.brokerEmail} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
            {errors.brokerEmail && <div className="text-red-500 text-sm">{errors.brokerEmail}</div>}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition"
          disabled={drivers.length === 0 || loadLoading}
        >
          {loadLoading ? "Submitting..." : "Submit"}
        </Button>
        {loadError && <div className="text-red-600 text-center font-medium mt-2">{loadError}</div>}
        {success && <div className="text-green-600 text-center font-medium mt-2">Load added successfully!</div>}
      </form>
    </div>
  );
} 