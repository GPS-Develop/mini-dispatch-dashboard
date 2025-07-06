"use client";
import { useState } from "react";
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

  function getDriverName(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : "Unknown Driver";
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function calculateNetPay(payStatement: PayStatement) {
    const totalAdditions = Object.values(payStatement.additions).reduce((sum: number, val: number) => sum + val, 0);
    const totalDeductions = Object.values(payStatement.deductions).reduce((sum: number, val: number) => sum + val, 0);
    return payStatement.gross_pay + totalAdditions - totalDeductions;
  }

  function handleDeleteRequest(id: string) {
    setConfirmingDelete(id);
    setDeleteError("");
    setSuccessMessage("");
  }

  async function confirmDelete() {
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
  }

  function cancelDelete() {
    setConfirmingDelete(null);
    setDeleteError("");
  }

  function handleCreateNew() {
    router.push("/pay-statements/create");
  }

  function handleView(id: string) {
    router.push(`/pay-statements/${id}`);
  }

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
      
      {!loading && payStatements.length > 0 && (
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
                {payStatements.map((ps) => (
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
            {payStatements.map((ps) => (
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
 