"use client";
import { useState, useCallback, useMemo } from "react";
import { usePayStatements } from "./PayStatementContext";
import { useDrivers } from "../drivers/DriverContext";
import { useRouter } from "next/navigation";
import Button from '../../components/Button/Button';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { EmptyPayStatements } from '../../components/EmptyState/EmptyState';
import { PayStatement } from '../../types';

export default function PayStatementsPage() {
  const { payStatements, deletePayStatement, loading, error } = usePayStatements();
  const { drivers } = useDrivers();
  const router = useRouter();
  const [deleteError, setDeleteError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Filter states
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Memoize driver lookup map to avoid repeated finds
  const driverMap = useMemo(() => {
    return drivers.reduce((acc, driver) => {
      acc[driver.id] = driver;
      return acc;
    }, {} as Record<string, typeof drivers[0]>);
  }, [drivers]);

  const getDriverName = useCallback((driverId: string) => {
    const driver = driverMap[driverId];
    return driver ? driver.name : "Unknown Driver";
  }, [driverMap]);

  // Memoize formatters to avoid recreation on every render
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  const calculateNetPay = useCallback((payStatement: PayStatement) => {
    const totalAdditions = Object.values(payStatement.additions).reduce((sum: number, val: number) => sum + val, 0);
    const totalDeductions = Object.values(payStatement.deductions).reduce((sum: number, val: number) => sum + val, 0);
    return payStatement.gross_pay + totalAdditions - totalDeductions;
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmingDelete(id);
    setDeleteError("");
    setSuccessMessage("");
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!confirmingDelete) return;
    
    try {
      await deletePayStatement(confirmingDelete);
      setDeleteError("");
      setSuccessMessage("Pay statement deleted successfully");
      setConfirmingDelete(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete pay statement');
      setConfirmingDelete(null);
    }
  }, [confirmingDelete, deletePayStatement]);

  const cancelDelete = useCallback(() => {
    setConfirmingDelete(null);
    setDeleteError("");
  }, []);

  const handleCreateNew = useCallback(() => {
    router.push("/pay-statements/create");
  }, [router]);

  const handleView = useCallback((id: string) => {
    router.push(`/pay-statements/${id}`);
  }, [router]);

  // Filter pay statements based on selected criteria
  const filteredPayStatements = useMemo(() => {
    let filtered = payStatements;

    // Filter by driver
    if (selectedDriver) {
      filtered = filtered.filter(ps => ps.driver_id === selectedDriver);
    }

    // Filter by date range
    if (startDate && endDate) {
      const startDateTime = new Date(startDate + 'T00:00:00');
      const endDateTime = new Date(endDate + 'T23:59:59');
      
      filtered = filtered.filter(ps => {
        const periodStart = new Date(ps.period_start);
        const periodEnd = new Date(ps.period_end);
        
        // Check if pay statement period overlaps with filter date range
        return (periodStart <= endDateTime && periodEnd >= startDateTime);
      });
    }

    return filtered;
  }, [payStatements, selectedDriver, startDate, endDate]);

  const clearFilters = useCallback(() => {
    setSelectedDriver("");
    setStartDate("");
    setEndDate("");
  }, []);

  return (
    <div className="page-container-xl">
      <div className="page-header">
        <h1 className="heading-xl">Pay Statements</h1>
        <Button 
          variant="primary" 
          onClick={handleCreateNew}
        >
          + Create Pay Statement
        </Button>
      </div>

      {/* Filter Section */}
      <div className="form-section-card">
        <h2 className="form-section-title">Filter Pay Statements</h2>
        <div className="form-three-column">
          <div className="form-field-container">
            <label className="label-text">Driver</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="input-field"
            >
              <option value="">All Drivers</option>
              {drivers.filter(d => d.driver_status === "active").map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field-container">
            <label className="label-text">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="form-field-container">
            <label className="label-text">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        {(selectedDriver || startDate || endDate) && (
          <div className="mt-4">
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="alert-success">
          {successMessage}
        </div>
      )}

      {(error || deleteError) && (
        <div className="alert-error">
          {error || deleteError}
        </div>
      )}

      {confirmingDelete && (
        <div className="alert-warning">
          <div style={{ marginBottom: '1rem' }}>
            Are you sure you want to delete this pay statement? This action cannot be undone.
          </div>
          <div className="button-group-horizontal">
            <Button variant="danger" onClick={confirmDelete}>
              Yes, Delete
            </Button>
            <Button variant="secondary" onClick={cancelDelete}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {loading && (
        <SkeletonTable rows={5} columns={6} />
      )}
      
      {!loading && payStatements.length === 0 && (
        <EmptyPayStatements onCreatePayStatement={() => router.push('/pay-statements/create')} />
      )}
      
      {!loading && filteredPayStatements.length === 0 && payStatements.length > 0 && (
        <div className="text-center py-8">
          <div className="text-muted mb-4">No pay statements found matching your filters.</div>
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}
      
      {!loading && filteredPayStatements.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Driver</th>
                  <th className="table-cell">Period</th>
                  <th className="table-cell">Gross Pay</th>
                  <th className="table-cell">Net Pay</th>
                  <th className="table-cell">Created</th>
                  <th className="table-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayStatements.map((ps) => (
                  <tr key={ps.id} className="table-row-hover">
                    <td className="table-cell font-medium">{getDriverName(ps.driver_id)}</td>
                    <td className="table-cell">
                      {formatDate(ps.period_start)} - {formatDate(ps.period_end)}
                    </td>
                    <td className="table-cell font-semibold text-success">
                      {formatCurrency(ps.gross_pay)}
                    </td>
                    <td className="table-cell font-semibold text-primary">
                      {formatCurrency(calculateNetPay(ps))}
                    </td>
                    <td className="table-cell text-muted">
                      {formatDate(ps.created_at)}
                    </td>
                    <td className="table-cell">
                      <div className="button-group-horizontal">
                        <Button 
                          variant="secondary" 
                          onClick={() => handleView(ps.id)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="danger" 
                          onClick={() => handleDeleteRequest(ps.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="pay-statement-cards">
            {filteredPayStatements.map((ps) => (
              <div key={ps.id} className="pay-statement-card">
                <div className="pay-statement-card-header">
                  <div>
                    <div className="pay-statement-card-title">{getDriverName(ps.driver_id)}</div>
                    <div className="pay-statement-card-period">
                      {formatDate(ps.period_start)} - {formatDate(ps.period_end)}
                    </div>
                  </div>
                </div>
                
                <div className="pay-statement-card-amounts">
                  <div className="pay-statement-card-amount">
                    <div className="pay-statement-card-amount-label">Gross Pay</div>
                    <div className="pay-statement-card-amount-value text-success">
                      {formatCurrency(ps.gross_pay)}
                    </div>
                  </div>
                  <div className="pay-statement-card-amount">
                    <div className="pay-statement-card-amount-label">Net Pay</div>
                    <div className="pay-statement-card-amount-value text-primary">
                      {formatCurrency(calculateNetPay(ps))}
                    </div>
                  </div>
                </div>
                
                <div className="pay-statement-card-created">
                  Created: {formatDate(ps.created_at)}
                </div>
                
                <div className="pay-statement-card-actions">
                  <Button 
                    variant="secondary" 
                    onClick={() => handleView(ps.id)}
                  >
                    View
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => handleDeleteRequest(ps.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
 