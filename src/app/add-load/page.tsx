"use client";
import { useState, useEffect } from "react";
import { useDrivers } from "../drivers/DriverContext";
import { useLoads } from "../loads/LoadContext";
import { supabase } from "../../utils/supabaseClient";

export default function AddLoadPage() {
  const { drivers } = useDrivers();
  const { addLoad, error: loadError, loading: loadLoading } = useLoads();
  const US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
  ];
  const [form, setForm] = useState({
    referenceId: "",
    pickups: [
      { address: "", state: "", datetime: "" }
    ],
    deliveries: [
      { address: "", state: "", datetime: "" }
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
    const { name, value } = e.target as { name: 'address' | 'state' | 'datetime'; value: string };
    setForm((prev) => {
      const pickups = [...prev.pickups];
      pickups[idx][name] = value;
      return { ...prev, pickups };
    });
  }

  function handleDeliveryChange(idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target as { name: 'address' | 'state' | 'datetime'; value: string };
    setForm((prev) => {
      const deliveries = [...prev.deliveries];
      deliveries[idx][name] = value;
      return { ...prev, deliveries };
    });
  }

  function addPickup() {
    setForm((prev) => ({ ...prev, pickups: [...prev.pickups, { address: "", state: "", datetime: "" }] }));
  }

  function removePickup(idx: number) {
    setForm((prev) => ({ ...prev, pickups: prev.pickups.filter((_, i) => i !== idx) }));
  }

  function addDelivery() {
    setForm((prev) => ({ ...prev, deliveries: [...prev.deliveries, { address: "", state: "", datetime: "" }] }));
  }

  function removeDelivery(idx: number) {
    setForm((prev) => ({ ...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx) }));
  }

  function validate() {
    const newErrors: any = {};
    if (!form.referenceId || !/^[0-9]+$/.test(form.referenceId)) newErrors.referenceId = "Reference ID must be a number";
    form.pickups.forEach((p, i) => {
      if (!p.address) newErrors[`pickupAddress${i}`] = "Required";
      if (!p.state) newErrors[`pickupState${i}`] = "Required";
      if (!p.datetime || isNaN(Date.parse(p.datetime))) newErrors[`pickupDatetime${i}`] = "Valid date required";
    });
    form.deliveries.forEach((d, i) => {
      if (!d.address) newErrors[`deliveryAddress${i}`] = "Required";
      if (!d.state) newErrors[`deliveryState${i}`] = "Required";
      if (!d.datetime || isNaN(Date.parse(d.datetime))) newErrors[`deliveryDatetime${i}`] = "Valid date required";
    });
    if (!form.loadType) newErrors.loadType = "Required";
    if (form.loadType === "Reefer" && (form.temperature === "" || isNaN(Number(form.temperature)))) newErrors.temperature = "Valid temperature required";
    if (!form.rate || isNaN(Number(form.rate)) || Number(form.rate) <= 0) newErrors.rate = "Valid rate required";
    if (!form.driver) newErrors.driver = "Required";
    if (!form.brokerName) newErrors.brokerName = "Required";
    if (!form.brokerContact || !/^[0-9]{10}$/.test(form.brokerContact)) newErrors.brokerContact = "Broker contact must be a 10-digit phone number";
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
      // 1. Create the load
      const { data, error } = await supabase.from("loads").insert([
        {
          reference_id: form.referenceId,
          load_type: form.loadType,
          temperature: form.temperature,
          rate: form.rate,
          driver_id: driverId,
          notes: form.notes,
          broker_name: form.brokerName,
          broker_contact: form.brokerContact,
          broker_email: form.brokerEmail,
          status: "Scheduled",
        }
      ]).select();
      if (error || !data || !data[0]) {
        setErrors({ submit: error?.message || "Failed to create load" });
        return;
      }
      const loadId = data[0].id;
      // 2. Insert pickups
      for (const p of form.pickups) {
        const { error: pickupError } = await supabase.from("pickups").insert([
          {
            load_id: loadId,
            address: p.address,
            state: p.state,
            datetime: p.datetime,
          }
        ]);
        if (pickupError) {
          setErrors({ submit: pickupError.message });
          return;
        }
      }
      // 3. Insert deliveries
      for (const d of form.deliveries) {
        const { error: deliveryError } = await supabase.from("deliveries").insert([
          {
            load_id: loadId,
            address: d.address,
            state: d.state,
            datetime: d.datetime,
          }
        ]);
        if (deliveryError) {
          setErrors({ submit: deliveryError.message });
          return;
        }
      }
      setSuccess(true);
      setForm({
        referenceId: "",
        pickups: [{ address: "", state: "", datetime: "" }],
        deliveries: [{ address: "", state: "", datetime: "" }],
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
          <label className="block font-medium mb-1">Pickups *</label>
          {form.pickups.map((pickup, idx) => (
            <div key={idx} className="mb-2 border rounded p-2 bg-gray-50">
              <div className="flex gap-2 mb-1">
                <input name="address" placeholder="Address" value={pickup.address} onChange={e => handlePickupChange(idx, e)} className="flex-1 border rounded px-3 py-2 bg-white text-gray-900" />
                <select name="state" value={pickup.state} onChange={e => handlePickupChange(idx, e)} className="border rounded px-3 py-2 bg-white text-gray-900">
                  <option value="">State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <input type="datetime-local" name="datetime" value={pickup.datetime} onChange={e => handlePickupChange(idx, e)} className="border rounded px-3 py-2 bg-white text-gray-900" />
                <button type="button" onClick={() => removePickup(idx)} className="text-red-600 font-bold px-2">-</button>
              </div>
              {errors[`pickupAddress${idx}`] && <div className="text-red-500 text-sm">{errors[`pickupAddress${idx}`]}</div>}
              {errors[`pickupState${idx}`] && <div className="text-red-500 text-sm">{errors[`pickupState${idx}`]}</div>}
              {errors[`pickupDatetime${idx}`] && <div className="text-red-500 text-sm">{errors[`pickupDatetime${idx}`]}</div>}
            </div>
          ))}
          <button type="button" onClick={addPickup} className="text-blue-600 font-bold">+ Add Pickup</button>
        </div>
        <div>
          <label className="block font-medium mb-1">Deliveries *</label>
          {form.deliveries.map((delivery, idx) => (
            <div key={idx} className="mb-2 border rounded p-2 bg-gray-50">
              <div className="flex gap-2 mb-1">
                <input name="address" placeholder="Address" value={delivery.address} onChange={e => handleDeliveryChange(idx, e)} className="flex-1 border rounded px-3 py-2 bg-white text-gray-900" />
                <select name="state" value={delivery.state} onChange={e => handleDeliveryChange(idx, e)} className="border rounded px-3 py-2 bg-white text-gray-900">
                  <option value="">State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <input type="datetime-local" name="datetime" value={delivery.datetime} onChange={e => handleDeliveryChange(idx, e)} className="border rounded px-3 py-2 bg-white text-gray-900" />
                <button type="button" onClick={() => removeDelivery(idx)} className="text-red-600 font-bold px-2">-</button>
              </div>
              {errors[`deliveryAddress${idx}`] && <div className="text-red-500 text-sm">{errors[`deliveryAddress${idx}`]}</div>}
              {errors[`deliveryState${idx}`] && <div className="text-red-500 text-sm">{errors[`deliveryState${idx}`]}</div>}
              {errors[`deliveryDatetime${idx}`] && <div className="text-red-500 text-sm">{errors[`deliveryDatetime${idx}`]}</div>}
            </div>
          ))}
          <button type="button" onClick={addDelivery} className="text-blue-600 font-bold">+ Add Delivery</button>
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