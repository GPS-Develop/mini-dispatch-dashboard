"use client";
import { useState } from "react";
import { usePayStatements } from "./PayStatementContext";
import { useDrivers } from "../drivers/DriverContext";
import { useRouter } from "next/navigation";
import Button from '../../components/Button/Button';

export default function PayStatementsPage() {
  const { payStatements, deletePayStatement, loading, error } = usePayStatements();
  const { drivers } = useDrivers();
  const router = useRouter();
  const [deleteError, setDeleteError] = useState("");

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

  function calculateNetPay(payStatement: any) {
    const totalAdditions = Object.values(payStatement.additions).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0);
    const totalDeductions = Object.values(payStatement.deductions).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0);
    return payStatement.gross_pay + totalAdditions - totalDeductions;
  }

  async function handleDelete(id: string) {
    if (window.confirm("Delete this pay statement?")) {
      try {
        await deletePayStatement(id);
        setDeleteError("");
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete pay statement');
      }
    }
  }

  function handleCreateNew() {
    router.push("/pay-statements/create");
  }

  function handleView(id: string) {
    router.push(`/pay-statements/${id}`);
  }

  return (
    <div className="page-container-xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading-lg">Pay Statements</h1>
        <Button 
          variant="primary" 
          onClick={handleCreateNew}
        >
          + Create Pay Statement
        </Button>
      </div>

      {(error || deleteError) && (
        <div className="alert-error mb-4">
          {error || deleteError}
        </div>
      )}
      
      {loading && (
        <div className="loading-container">
          <div className="text-muted">Loading pay statements...</div>
        </div>
      )}
      
      {!loading && payStatements.length === 0 && (
        <div className="loading-container">
          <div className="text-muted">No pay statements found. Click "Create Pay Statement" to get started.</div>
        </div>
      )}
      
      {!loading && payStatements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-container">
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
                  <td className="table-cell font-semibold text-blue-600">
                    {formatCurrency(calculateNetPay(ps))}
                  </td>
                  <td className="table-cell text-muted">
                    {formatDate(ps.created_at)}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleView(ps.id)}
                        className="text-sm"
                      >
                        View
                      </Button>
                      <Button 
                        variant="danger" 
                        onClick={() => handleDelete(ps.id)}
                        className="text-sm"
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
      )}
    </div>
  );
}
 