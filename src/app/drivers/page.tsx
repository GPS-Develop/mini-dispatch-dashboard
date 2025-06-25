"use client";
import { useState } from "react";
import { useDrivers, Driver } from "./DriverContext";

type DriverForm = {
  name: string;
  phone: string;
  status: "Available" | "On Load";
  payRate: string;
  scheduledLoads: string[];
  inTransitLoads: string[];
};

const emptyDriver: DriverForm = {
  name: "",
  phone: "",
  status: "Available",
  payRate: "",
  scheduledLoads: [],
  inTransitLoads: [],
};

export default function DriversPage() {
  const { drivers, addDriver, updateDriver, deleteDriver } = useDrivers();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverForm>(emptyDriver);
  const [error, setError] = useState("");

  function openAdd() {
    setForm(emptyDriver);
    setEditId(null);
    setShowForm(true);
    setError("");
  }
  function openEdit(driver: Driver) {
    setForm({
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
      payRate: driver.payRate,
      scheduledLoads: driver.scheduledLoads || [],
      inTransitLoads: driver.inTransitLoads || [],
    });
    setEditId(driver.id);
    setShowForm(true);
    setError("");
  }
  function handleChange(e: any) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }
  function handleSubmit(e: any) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.payRate) {
      setError("Name, phone, and pay rate are required.");
      return;
    }
    if (editId) updateDriver(editId, form);
    else addDriver(form);
    setShowForm(false);
  }
  function handleDelete(id: string) {
    if (window.confirm("Delete this driver?")) deleteDriver(id);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">+ Add Driver</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border border-gray-200 bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-semibold">
              <th className="p-2">Name</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Status</th>
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
                <td className="p-2">{d.phone}</td>
                <td className="p-2">
                  <span className={
                    d.status === "Available"
                      ? "text-green-600 font-semibold"
                      : "text-yellow-700 font-semibold"
                  }>
                    {d.status}
                  </span>
                </td>
                <td className="p-2">{d.payRate}</td>
                <td className="p-2">{d.scheduledLoads && d.scheduledLoads.length > 0 ? d.scheduledLoads.map(l => `#${l}`).join(", ") : <span className="text-gray-400">-</span>}</td>
                <td className="p-2">{d.inTransitLoads && d.inTransitLoads.length > 0 ? d.inTransitLoads.map(l => `#${l}`).join(", ") : <span className="text-gray-400">-</span>}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <input name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block font-medium mb-1">Status *</label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" disabled>
                  <option value="Available">Available</option>
                  <option value="On Load">On Load</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Pay Rate *</label>
                <input name="payRate" value={form.payRate} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block font-medium mb-1">Scheduled</label>
                <input value={form.scheduledLoads && form.scheduledLoads.length > 0 ? form.scheduledLoads.map(l => `#${l}`).join(", ") : "-"} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500" disabled />
              </div>
              <div>
                <label className="block font-medium mb-1">In-Transit</label>
                <input value={form.inTransitLoads && form.inTransitLoads.length > 0 ? form.inTransitLoads.map(l => `#${l}`).join(", ") : "-"} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500" disabled />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">{editId ? "Save" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 