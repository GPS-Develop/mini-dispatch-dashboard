"use client";
import { useState, useEffect } from "react";
import { usePayStatements } from "./PayStatementContext";
import { useDrivers } from "../drivers/DriverContext";
import { useRouter } from "next/navigation";
import Button from '../../components/Button/Button';
import { TripSummary } from "../../types";

const ADDITION_FIELDS = [
  { key: 'dispatch_difference', label: 'Dispatch Difference' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'other_addition', label: 'Other Addition' },
];

const DEDUCTION_FIELDS = [
  { key: 'factoring', label: 'Factoring' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'parking', label: 'Parking' },
  { key: 'dispatch_charges', label: 'Dispatch Charges' },
  { key: 'truck_fuel', label: 'Fuel Expenses (TOC) Truck Fuel' },
  { key: 'trailer_fuel', label: 'Fuel Expenses (TOC) Trailer Fuel' },
  { key: 'cash_advance', label: 'Fuel Expenses (TOC) Cash Advance From Card' },
  { key: 'other_deduction', label: 'Other Deduction' },
];

export default function CreatePayStatementPage() {
  const { addPayStatement, calculateGrossPay, loading: payStatementLoading, error } = usePayStatements();
  const { drivers } = useDrivers();
  const router = useRouter();

  const [form, setForm] = useState({
    driver_id: '',
    period_start: '',
    period_end: '',
    notes: '',
  });

  const [additions, setAdditions] = useState<Record<string, number>>({});
  const [deductions, setDeductions] = useState<Record<string, number>>({});
  const [grossPay, setGrossPay] = useState(0);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate current month as default period
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setForm(prev => ({
      ...prev,
      period_start: firstDay.toISOString().split('T')[0],
      period_end: lastDay.toISOString().split('T')[0],
    }));
  }, []);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleAdditionChange(key: string, value: string) {
    const numValue = parseFloat(value) || 0;
    setAdditions(prev => ({ ...prev, [key]: numValue }));
  }

  function handleDeductionChange(key: string, value: string) {
    const numValue = parseFloat(value) || 0;
    setDeductions(prev => ({ ...prev, [key]: numValue }));
  }

  async function handleCalculateGrossPay() {
    if (!form.driver_id || !form.period_start || !form.period_end) {
      setFormError("Please select driver and period dates first.");
      return;
    }

    setCalculating(true);
    setFormError("");
    
    try {
      const result = await calculateGrossPay(form.driver_id, form.period_start, form.period_end);
      setGrossPay(result.grossPay);
      setTrips(result.trips);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to calculate gross pay');
    } finally {
      setCalculating(false);
    }
  }

  function calculateTotals() {
    const totalAdditions = Object.values(additions).reduce((sum, val) => sum + val, 0);
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const netPay = grossPay + totalAdditions - totalDeductions;

    return { totalAdditions, totalDeductions, netPay };
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!form.driver_id || !form.period_start || !form.period_end) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (grossPay === 0) {
      setFormError("Please calculate gross pay first.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      // Filter out zero values
      const filteredAdditions = Object.fromEntries(
        Object.entries(additions).filter(([_, value]) => value > 0)
      );
      const filteredDeductions = Object.fromEntries(
        Object.entries(deductions).filter(([_, value]) => value > 0)
      );

      await addPayStatement({
        driver_id: form.driver_id,
        period_start: form.period_start,
        period_end: form.period_end,
        gross_pay: grossPay,
        additions: filteredAdditions,
        deductions: filteredDeductions,
        notes: form.notes,
      });

      router.push("/pay-statements");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create pay statement');
    } finally {
      setIsSubmitting(false);
    }
  }

  const { totalAdditions, totalDeductions, netPay } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Pay Statement</h1>
        <Button 
          variant="secondary" 
          onClick={() => router.push("/pay-statements")}
          className="text-gray-600 hover:text-gray-800"
        >
          Cancel
        </Button>
      </div>

      {(error || formError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error || formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1">Driver *</label>
            <select
              name="driver_id"
              value={form.driver_id}
              onChange={handleFormChange}
              className="w-full border rounded px-3 py-2 bg-white text-gray-900"
              required
            >
              <option value="">Select driver</option>
              {drivers.filter(d => d.driver_status === "active").map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Period Start *</label>
            <input
              type="date"
              name="period_start"
              value={form.period_start}
              onChange={handleFormChange}
              className="w-full border rounded px-3 py-2 bg-white text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Period End *</label>
            <input
              type="date"
              name="period_end"
              value={form.period_end}
              onChange={handleFormChange}
              className="w-full border rounded px-3 py-2 bg-white text-gray-900"
              required
            />
          </div>
        </div>

        {/* Calculate Gross Pay */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Gross Pay Calculation</h3>
            <Button
              type="button"
              onClick={handleCalculateGrossPay}
              disabled={calculating || !form.driver_id || !form.period_start || !form.period_end}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {calculating ? "Calculating..." : "Calculate Gross Pay"}
            </Button>
          </div>

          {grossPay > 0 && (
            <>
              <div className="mb-4">
                <div className="text-2xl font-bold text-green-600">
                  Gross Pay: {formatCurrency(grossPay)}
                </div>
                <div className="text-sm text-gray-600">
                  Based on {trips.length} delivered load(s) in the selected period
                </div>
              </div>

              {trips.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">Trip#</th>
                        <th className="p-2 text-left">Picked</th>
                        <th className="p-2 text-left">From Location(s)</th>
                        <th className="p-2 text-left">Drop</th>
                        <th className="p-2 text-left">To Location(s)</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((trip, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{trip.trip_number}</td>
                          <td className="p-2">{trip.picked_date}</td>
                          <td className="p-2 max-w-xs">
                            <div className="whitespace-pre-line text-sm">{trip.from_city}</div>
                          </td>
                          <td className="p-2">{trip.drop_date}</td>
                          <td className="p-2 max-w-xs">
                            <div className="whitespace-pre-line text-sm">{trip.to_city}</div>
                          </td>
                          <td className="p-2 text-right font-semibold">{formatCurrency(trip.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Additions */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Additions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADDITION_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block font-medium mb-1">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={additions[field.key] || ''}
                  onChange={(e) => handleAdditionChange(field.key, e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <div className="text-lg font-semibold text-green-600">
              Total Additions: {formatCurrency(totalAdditions)}
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Deductions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEDUCTION_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block font-medium mb-1">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={deductions[field.key] || ''}
                  onChange={(e) => handleDeductionChange(field.key, e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white text-gray-900"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <div className="text-lg font-semibold text-red-600">
              Total Deductions: {formatCurrency(totalDeductions)}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">Pay Statement Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Gross Pay:</span>
              <span className="font-semibold">{formatCurrency(grossPay)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Add:</span>
              <span className="font-semibold">{formatCurrency(totalAdditions)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Less:</span>
              <span className="font-semibold">{formatCurrency(totalDeductions)}</span>
            </div>
            <hr className="border-gray-300" />
            <div className="flex justify-between text-xl font-bold text-blue-600">
              <span>Net Pay:</span>
              <span>{formatCurrency(netPay)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleFormChange}
            rows={3}
            className="w-full border rounded px-3 py-2 bg-white text-gray-900"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting || payStatementLoading || grossPay === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? "Creating..." : "Create Pay Statement"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/pay-statements")}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded font-semibold hover:bg-gray-300"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
