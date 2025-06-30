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
    <div className="max-w-6xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pay Statements</h1>
        <Button 
          variant="primary" 
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition"
        >
          + Create Pay Statement
        </Button>
      </div>

      {(error || deleteError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error || deleteError}
        </div>
      )}
      
      {loading && (
        <div className="text-center py-8">
          <div className="text-gray-600">Loading pay statements...</div>
        </div>
      )}
      
      {!loading && payStatements.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-600">No pay statements found. Click "Create Pay Statement" to get started.</div>
        </div>
      )}
      
      {!loading && payStatements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border border-gray-200 bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-900 font-semibold">
                <th className="p-3">Driver</th>
                <th className="p-3">Period</th>
                <th className="p-3">Gross Pay</th>
                <th className="p-3">Net Pay</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payStatements.map((ps) => (
                <tr key={ps.id} className="border-t border-gray-200 bg-white text-gray-900 hover:bg-gray-50">
                  <td className="p-3 font-medium">{getDriverName(ps.driver_id)}</td>
                  <td className="p-3">
                    {formatDate(ps.period_start)} - {formatDate(ps.period_end)}
                  </td>
                  <td className="p-3 font-semibold text-green-600">
                    {formatCurrency(ps.gross_pay)}
                  </td>
                  <td className="p-3 font-semibold text-blue-600">
                    {formatCurrency(calculateNetPay(ps))}
                  </td>
                  <td className="p-3 text-gray-600">
                    {formatDate(ps.created_at)}
                  </td>
                  <td className="p-3 flex gap-2">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleView(ps.id)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => handleDelete(ps.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </Button>
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
 