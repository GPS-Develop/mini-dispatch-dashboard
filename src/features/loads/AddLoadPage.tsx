"use client";
import { useState, useEffect } from "react";
import { useDrivers } from "../../features/drivers/DriverContext";
import { useLoads } from "../../features/loads/LoadContext";
import { useRouter } from "next/navigation";
import { sanitizePhone, validateRate } from '../../utils/validation';
import BrokerAutocomplete from '../../components/BrokerAutocomplete/BrokerAutocomplete';
import { US_STATES } from '../../utils/constants';

export default function AddLoadPage() {
  const { drivers } = useDrivers();
  const { addFullLoad, error: loadError, loading: loadLoading } = useLoads();
  const router = useRouter();
  const [form, setForm] = useState({
    referenceId: "",
    pickups: [
      { name: "", address: "", city: "", state: "", postal_code: "", datetime: "" }
    ],
    deliveries: [
      { name: "", address: "", city: "", state: "", postal_code: "", datetime: "" }
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setShowTemp(form.loadType === "Reefer");
  }, [form.loadType]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePickupChange(idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target as { name: 'name' | 'address' | 'city' | 'state' | 'postal_code' | 'datetime'; value: string };
    setForm((prev) => {
      const pickups = [...prev.pickups];
      pickups[idx][name] = value;
      return { ...prev, pickups };
    });
  }

  function handleDeliveryChange(idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target as { name: 'name' | 'address' | 'city' | 'state' | 'postal_code' | 'datetime'; value: string };
    setForm((prev) => {
      const deliveries = [...prev.deliveries];
      deliveries[idx][name] = value;
      return { ...prev, deliveries };
    });
  }

  function addPickup() {
    setForm((prev) => ({ ...prev, pickups: [...prev.pickups, { name: "", address: "", city: "", state: "", postal_code: "", datetime: "" }] }));
  }

  function removePickup(idx: number) {
    setForm((prev) => ({ ...prev, pickups: prev.pickups.filter((_, i) => i !== idx) }));
  }

  function addDelivery() {
    setForm((prev) => ({ ...prev, deliveries: [...prev.deliveries, { name: "", address: "", city: "", state: "", postal_code: "", datetime: "" }] }));
  }

  function removeDelivery(idx: number) {
    setForm((prev) => ({ ...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx) }));
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.referenceId) newErrors.referenceId = "Required";
    if (form.pickups.length === 0) newErrors.pickups = "At least one pickup required";
    if (form.deliveries.length === 0) newErrors.deliveries = "At least one delivery required";
    
    // Validate pickup names and postal codes
    form.pickups.forEach((pickup, idx) => {
      if (!pickup.name.trim()) {
        newErrors[`pickup_name_${idx}`] = "Pickup location name is required";
      }
      if (!pickup.postal_code.trim()) {
        newErrors[`pickup_postal_code_${idx}`] = "Pickup postal code is required";
      }
    });
    
    // Validate delivery names and postal codes
    form.deliveries.forEach((delivery, idx) => {
      if (!delivery.name.trim()) {
        newErrors[`delivery_name_${idx}`] = "Delivery location name is required";
      }
      if (!delivery.postal_code.trim()) {
        newErrors[`delivery_postal_code_${idx}`] = "Delivery postal code is required";
      }
    });
    
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

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="form-page-container">
      <h1 className="heading-lg">Add Load</h1>
      
      <form className="form-container" onSubmit={handleSubmit}>
        {/* Basic Load Information */}
        <div className="form-section-card">
          <h2 className="form-section-title">Load Information</h2>
          <div className="form-two-column">
            <div className="form-field-container">
              <label className="label-text">Load Reference ID *</label>
              <input 
                name="referenceId" 
                value={form.referenceId} 
                onChange={handleChange} 
                className={errors.referenceId ? "input-field-error" : "input-field"}
              />
              {errors.referenceId && <div className="text-error text-sm">{errors.referenceId}</div>}
            </div>
            
            <div className="form-field-container">
              <label className="label-text">Load Type *</label>
              <select 
                name="loadType" 
                value={form.loadType} 
                onChange={handleChange} 
                className={errors.loadType ? "input-field-error" : "input-field"}
              >
                <option value="Reefer">Reefer</option>
                <option value="Dry Van">Dry Van</option>
                <option value="Flatbed">Flatbed</option>
              </select>
              {errors.loadType && <div className="text-error text-sm">{errors.loadType}</div>}
            </div>
          </div>
          
          <div className="form-two-column">
            {showTemp && (
              <div className="form-field-container">
                <label className="label-text">Temperature (°F) *</label>
                <input 
                  name="temperature" 
                  type="number"
                  step="0.1"
                  min="-100"
                  max="200"
                  value={form.temperature} 
                  onChange={handleChange} 
                  className={errors.temperature ? "input-field-error" : "input-field"}
                  placeholder="e.g., -10, 35, 72"
                />
                <div className="text-hint">Enter temperature in Fahrenheit (range: -100°F to 200°F)</div>
                {errors.temperature && <div className="text-error text-sm">{errors.temperature}</div>}
              </div>
            )}

            <div className="form-field-container">
              <label className="label-text">Rate ($) *</label>
              <input 
                name="rate" 
                type="number"
                min="0"
                step="1"
                value={form.rate} 
                onChange={handleChange} 
                className={errors.rate ? "input-field-error" : "input-field"}
                placeholder="2500"
              />
              <div className="text-hint">Enter rate in USD as whole number (e.g., 2500)</div>
              {errors.rate && <div className="text-error text-sm">{errors.rate}</div>}
            </div>
          </div>
        </div>

        {/* Pickup Locations */}
        <div className="form-section-card">
          <h2 className="form-section-title">Pickup Locations</h2>
          <div className="form-item-group">
            {form.pickups.map((pickup, idx) => (
              <div key={idx} className="form-item-card">
                <div className="form-item-inputs">
                  <input
                    name="name"
                    placeholder="Location Name *"
                    value={pickup.name}
                    onChange={e => handlePickupChange(idx, e)}
                    className="input-field-flex"
                    required
                  />
                  <input
                    name="address"
                    placeholder="Address"
                    value={pickup.address}
                    onChange={e => handlePickupChange(idx, e)}
                    className="input-field-flex"
                  />
                  <input
                    name="city"
                    placeholder="City"
                    value={pickup.city}
                    onChange={e => handlePickupChange(idx, e)}
                    className="input-field-sm"
                  />
                  <select
                    name="state"
                    value={pickup.state}
                    onChange={e => handlePickupChange(idx, e)}
                    className="input-field"
                  >
                    <option value="">State</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <input
                    name="postal_code"
                    placeholder="Postal Code *"
                    value={pickup.postal_code}
                    onChange={e => handlePickupChange(idx, e)}
                    className="input-field-sm"
                    required
                  />
                  <input
                    type="datetime-local"
                    name="datetime"
                    value={pickup.datetime}
                    onChange={e => handlePickupChange(idx, e)}
                    className="input-field"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePickup(idx)}
                  className="btn-icon-danger"
                  title="Remove Pickup"
                  tabIndex={0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={addPickup} className="btn-add">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Pickup
            </button>
          </div>
        </div>

        {/* Delivery Locations */}
        <div className="form-section-card">
          <h2 className="form-section-title">Delivery Locations</h2>
          <div className="form-item-group">
            {form.deliveries.map((delivery, idx) => (
              <div key={idx} className="form-item-card">
                <div className="form-item-inputs">
                  <input
                    name="name"
                    placeholder="Location Name *"
                    value={delivery.name}
                    onChange={e => handleDeliveryChange(idx, e)}
                    className="input-field-flex"
                    required
                  />
                  <input
                    name="address"
                    placeholder="Address"
                    value={delivery.address}
                    onChange={e => handleDeliveryChange(idx, e)}
                    className="input-field-flex"
                  />
                  <input
                    name="city"
                    placeholder="City"
                    value={delivery.city}
                    onChange={e => handleDeliveryChange(idx, e)}
                    className="input-field-sm"
                  />
                  <select
                    name="state"
                    value={delivery.state}
                    onChange={e => handleDeliveryChange(idx, e)}
                    className="input-field"
                  >
                    <option value="">State</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <input
                    name="postal_code"
                    placeholder="Postal Code *"
                    value={delivery.postal_code}
                    onChange={e => handleDeliveryChange(idx, e)}
                    className="input-field-sm"
                    required
                  />
                  <input
                    type="datetime-local"
                    name="datetime"
                    value={delivery.datetime}
                    onChange={e => handleDeliveryChange(idx, e)}
                    className="input-field"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeDelivery(idx)}
                  className="btn-icon-danger"
                  title="Remove Delivery"
                  tabIndex={0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={addDelivery} className="btn-add">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Delivery
            </button>
          </div>
        </div>

        {/* Driver Assignment */}
        <div className="form-section-card">
          <h2 className="form-section-title">Driver Assignment</h2>
          <div className="form-two-column">
            <div className="form-field-container">
              <label className="label-text">Driver *</label>
              {drivers.length === 0 ? (
                <div className="text-error text-sm mb-2">No drivers available. Please add a driver first.</div>
              ) : null}
              <select
                name="driver"
                value={form.driver}
                onChange={handleChange}
                className={errors.driver ? "input-field-error" : "input-field"}
                disabled={drivers.length === 0}
              >
                <option value="">Select driver</option>
                {drivers.filter(d => d.driver_status === "active").map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              {errors.driver && <div className="text-error text-sm">{errors.driver}</div>}
            </div>
            
            <div className="form-field-container-lg">
              <label className="label-text">Dispatcher Notes</label>
              <textarea 
                name="notes" 
                value={form.notes} 
                onChange={handleChange} 
                className="input-field" 
                rows={3}
                placeholder="Add any special instructions or notes for the driver..."
              />
            </div>
          </div>
        </div>

        {/* Broker Information */}
        <div className="form-section-card">
          <h2 className="form-section-title">Broker Information</h2>
          <div className="form-three-column">
            <div className="form-field-container">
              <label className="label-text">Broker Name *</label>
              <BrokerAutocomplete
                value={form.brokerName}
                email={form.brokerEmail}
                contact={form.brokerContact}
                onChange={(field, value) => {
                  setForm(prev => ({ ...prev, [field]: value }));
                }}
                error={errors.brokerName}
                placeholder="Enter broker company name"
              />
              {errors.brokerName && <div className="text-error text-sm">{errors.brokerName}</div>}
            </div>
            <div className="form-field-container">
              <label className="label-text">Broker Contact *</label>
              <input 
                name="brokerContact" 
                type="tel"
                value={form.brokerContact} 
                onChange={handleChange} 
                className={errors.brokerContact ? "input-field-error" : "input-field"}
                placeholder="(555) 123-4567"
              />
              {errors.brokerContact && <div className="text-error text-sm">{errors.brokerContact}</div>}
            </div>
            <div className="form-field-container">
              <label className="label-text">Broker Email *</label>
              <input 
                name="brokerEmail" 
                type="email"
                value={form.brokerEmail} 
                onChange={handleChange} 
                className={errors.brokerEmail ? "input-field-error" : "input-field"}
                placeholder="broker@company.com"
              />
              {errors.brokerEmail && <div className="text-error text-sm">{errors.brokerEmail}</div>}
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="form-submit-section">
          <button
            type="submit"
            className="btn-primary form-submit-button"
            disabled={drivers.length === 0 || loadLoading}
          >
            {loadLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              "Create Load"
            )}
          </button>
          
          {loadError && (
            <div className="alert-error">
              <strong>Error:</strong> {loadError}
            </div>
          )}
        </div>
      </form>
    </div>
  );
} 