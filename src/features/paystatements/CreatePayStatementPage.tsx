"use client";
import { useState, useEffect } from "react";
import { usePayStatements } from "./PayStatementContext";
import { useDrivers } from "../drivers/DriverContext";
import { useRouter } from "next/navigation";
import { createClient } from '../../utils/supabase/client';
import Button from '../../components/Button/Button';
import { TripSummary } from "../../types";

const ADDITION_FIELDS = [
  { key: 'dispatch_difference', label: 'Dispatch Difference' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'lumper_reimbursement', label: 'Lumper Reimbursement' },
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
  const supabase = createClient();

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

  async function calculateLumperReimbursements(driver_id: string, period_start: string, period_end: string) {
    try {
      // Get all loads for this driver in the pay period that were delivered
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select(`
          id,
          reference_id,
          status,
          created_at,
          lumper_services (
            paid_by_driver,
            driver_amount,
            driver_payment_reason
          )
        `)
        .eq('driver_id', driver_id)
        .eq('status', 'Delivered')
        .gte('created_at', period_start)
        .lte('created_at', period_end + 'T23:59:59');

      if (loadsError) {
        console.error('Error fetching lumper data:', loadsError);
        return;
      }

      // Calculate total lumper reimbursements
      let totalLumperReimbursement = 0;
      const lumperDetails: string[] = [];

      loads?.forEach(load => {
        const lumperService = load.lumper_services[0]; // Each load should have at most one lumper service
        if (lumperService?.paid_by_driver && lumperService.driver_amount) {
          totalLumperReimbursement += lumperService.driver_amount;
          const reason = lumperService.driver_payment_reason ? ` (${lumperService.driver_payment_reason})` : '';
          lumperDetails.push(`Load #${load.reference_id}: $${lumperService.driver_amount}${reason}`);
        }
      });

      // Auto-populate the lumper reimbursement field if there are any payments
      if (totalLumperReimbursement > 0) {
        setAdditions(prev => ({ 
          ...prev, 
          lumper_reimbursement: totalLumperReimbursement 
        }));
        
        // Update notes to include lumper details
        const lumperNote = `Lumper Reimbursements:\n${lumperDetails.join('\n')}`;
        setForm(prev => ({
          ...prev,
          notes: prev.notes ? `${prev.notes}\n\n${lumperNote}` : lumperNote
        }));
      }
    } catch (error) {
      console.error('Error calculating lumper reimbursements:', error);
    }
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

      // Calculate lumper reimbursements for this period
      await calculateLumperReimbursements(form.driver_id, form.period_start, form.period_end);
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
        Object.entries(additions).filter(([, value]) => value > 0)
      );
      const filteredDeductions = Object.fromEntries(
        Object.entries(deductions).filter(([, value]) => value > 0)
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
    <div className="page-container-xl">
      <div className="page-header">
        <h1 className="heading-xl">Create Pay Statement</h1>
        <Button 
          variant="secondary" 
          onClick={() => router.push("/pay-statements")}
        >
          Cancel
        </Button>
      </div>

      {(error || formError) && (
        <div className="alert-error">
          {error || formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container">
        {/* Basic Info */}
        <div className="form-section-card">
          <h2 className="form-section-title">Pay Statement Details</h2>
          <div className="form-three-column">
            <div className="form-field-container">
              <label className="label-text">Driver *</label>
              <select
                name="driver_id"
                value={form.driver_id}
                onChange={handleFormChange}
                className="input-field"
                required
              >
                <option value="">Select driver</option>
                {drivers.filter(d => d.driver_status === "active").map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field-container">
              <label className="label-text">Period Start *</label>
              <input
                type="date"
                name="period_start"
                value={form.period_start}
                onChange={handleFormChange}
                className="input-field"
                required
              />
            </div>
            <div className="form-field-container">
              <label className="label-text">Period End *</label>
              <input
                type="date"
                name="period_end"
                value={form.period_end}
                onChange={handleFormChange}
                className="input-field"
                required
              />
            </div>
          </div>
        </div>

        {/* Calculate Gross Pay */}
        <div className="form-section-card" style={{ minHeight: '500px' }}>
          <div className="page-header mb-6">
            <h3 className="form-section-title">Gross Pay Calculation</h3>
            <Button
              type="button"
              variant="primary"
              onClick={handleCalculateGrossPay}
              disabled={calculating || !form.driver_id || !form.period_start || !form.period_end}
            >
              {calculating ? "Calculating..." : "Calculate Gross Pay"}
            </Button>
          </div>

          {grossPay > 0 && (
            <>
              <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="heading-xl text-success mb-2">
                  Gross Pay: {formatCurrency(grossPay)}
                </div>
                <div className="text-lg text-muted">
                  Based on {trips.length} delivered load(s) in the selected period
                </div>
              </div>

              {trips.length > 0 && (
                <div className="w-full">
                  <h4 className="heading-md mb-4">Trip Details</h4>
                  <div className="overflow-x-auto">
                    <div className="table-container" style={{ minWidth: '100%' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="table-header">
                            <th className="table-cell text-left" style={{ minWidth: '100px' }}>Trip#</th>
                            <th className="table-cell text-left" style={{ minWidth: '200px' }}>📦 Pickup Location(s)</th>
                            <th className="table-cell text-left" style={{ minWidth: '200px' }}>🚚 Delivery Location(s)</th>
                            <th className="table-cell text-right" style={{ minWidth: '120px' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trips.map((trip, index) => (
                            <tr key={index} className="table-row-hover">
                              <td className="table-cell font-medium">{trip.trip_number}</td>
                              <td className="table-cell">
                                <div className="font-medium">{trip.from_city}</div>
                                <div className="text-sm text-muted">{trip.picked_date}</div>
                              </td>
                              <td className="table-cell">
                                <div className="font-medium">{trip.to_city}</div>
                                <div className="text-sm text-muted">{trip.drop_date}</div>
                              </td>
                              <td className="table-cell text-right font-bold text-lg text-success">{formatCurrency(trip.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Additions */}
        <div className="form-section-card">
          <h3 className="form-section-title">Additions</h3>
          <div className="form-two-column">
            {ADDITION_FIELDS.map((field) => (
              <div key={field.key} className="form-field-container">
                <label className="label-text">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={additions[field.key] || ''}
                  onChange={(e) => handleAdditionChange(field.key, e.target.value)}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <div className="heading-md text-success">
              Total Additions: {formatCurrency(totalAdditions)}
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="form-section-card">
          <h3 className="form-section-title">Deductions</h3>
          <div className="form-two-column">
            {DEDUCTION_FIELDS.map((field) => (
              <div key={field.key} className="form-field-container">
                <label className="label-text">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={deductions[field.key] || ''}
                  onChange={(e) => handleDeductionChange(field.key, e.target.value)}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <div className="heading-md text-danger">
              Total Deductions: {formatCurrency(totalDeductions)}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-section">
          <h3 className="form-section-title">Pay Statement Summary</h3>
          <div>
            <div className="summary-row">
              <span>Gross Pay:</span>
              <span className="font-semibold">{formatCurrency(grossPay)}</span>
            </div>
            <div className="summary-row text-success">
              <span>Add:</span>
              <span className="font-semibold">{formatCurrency(totalAdditions)}</span>
            </div>
            <div className="summary-row text-danger">
              <span>Less:</span>
              <span className="font-semibold">{formatCurrency(totalDeductions)}</span>
            </div>
            <div className="summary-total text-primary">
              <span>Net Pay:</span>
              <span>{formatCurrency(netPay)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="form-section-card">
          <div className="form-field-container-lg">
            <label className="label-text">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              rows={3}
              className="input-field"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Submit */}
        <div className="form-submit-section">
          <div className="button-group-horizontal">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || payStatementLoading || grossPay === 0}
            >
              {isSubmitting ? "Creating..." : "Create Pay Statement"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/pay-statements")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
