"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePayStatements } from "./PayStatementContext";
import { useDrivers } from "../drivers/DriverContext";
import Button from '../../components/Button/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ViewPayStatementPageProps {
  payStatementId: string;
}

export default function ViewPayStatementPage({ payStatementId }: ViewPayStatementPageProps) {
  const { payStatements, calculateGrossPay, loading, error } = usePayStatements();
  const { drivers } = useDrivers();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [payStatement, setPayStatement] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  

  const payStatementData = payStatements.find(ps => ps.id === payStatementId);
  const driver = drivers.find(d => d.id === payStatementData?.driver_id);

  useEffect(() => {
    if (payStatementData && driver) {
      setPayStatement(payStatementData);
      
      // Fetch trip details for this pay statement
      const fetchTrips = async () => {
        try {
          const result = await calculateGrossPay(
            payStatementData.driver_id,
            payStatementData.period_start,
            payStatementData.period_end
          );
          setTrips(result.trips);
        } catch (err) {
          console.error('Failed to fetch trip details:', err);
        }
      };
      
      fetchTrips();
    }
  }, [payStatementData, driver, calculateGrossPay]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function calculateTotals() {
    if (!payStatement) return { totalAdditions: 0, totalDeductions: 0, netPay: 0 };
    
    const totalAdditions = Object.values(payStatement.additions).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0);
    const totalDeductions = Object.values(payStatement.deductions).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0);
    const netPay = payStatement.gross_pay + totalAdditions - totalDeductions;

    return { totalAdditions, totalDeductions, netPay };
  }

  const generatePDF = async () => {
    if (!printRef.current) {
      alert('Print content not ready. Please try again.');
      return;
    }
    
    setIsGeneratingPDF(true);
    
    try {
      console.log('Starting PDF generation...');
      
      // Wait a bit to ensure all content is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = printRef.current;
      console.log('Element dimensions:', element.offsetWidth, element.offsetHeight);
      
      const canvas = await html2canvas(element, {
        scale: 1.5, // Reduced scale to avoid memory issues
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging for debugging
        height: element.scrollHeight,
        width: element.scrollWidth,
        scrollX: 0,
        scrollY: 0,
      });
      
      console.log('Canvas created:', canvas.width, canvas.height);
      
      const imgData = canvas.toDataURL('image/png', 0.95); // Reduced quality slightly
      console.log('Image data created, length:', imgData.length);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm  
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Create filename without special characters
      const driverName = driver?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Driver';
      const startDate = payStatement.period_start.replace(/[^0-9]/g, '');
      const endDate = payStatement.period_end.replace(/[^0-9]/g, '');
      const fileName = `PayStatement_${driverName}_${startDate}_${endDate}.pdf`;
      
      console.log('Saving PDF as:', fileName);
      pdf.save(fileName);
      
      console.log('PDF generated successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
        <div className="text-center py-8">
          <div className="text-gray-600">Loading pay statement...</div>
        </div>
      </div>
    );
  }

  if (error || !payStatement || !driver) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
        <div className="text-center py-8">
          <div className="text-red-600">Pay statement not found or failed to load.</div>
          <Button 
            variant="secondary" 
            onClick={() => router.push("/pay-statements")}
            className="mt-4"
          >
            Back to Pay Statements
          </Button>
        </div>
      </div>
    );
  }

  const { totalAdditions, totalDeductions, netPay } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-gray-900 rounded-xl shadow-lg mt-8 mb-8 font-sans">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button 
          variant="secondary" 
          onClick={() => router.push("/pay-statements")}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back to Pay Statements
        </Button>
        <Button 
          variant="primary" 
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Printable Content */}
      <div 
        ref={printRef} 
        style={{ 
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.4',
          color: '#000000',
          backgroundColor: '#ffffff',
          padding: '32px'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>PAY STATEMENT</h1>
          <div style={{ fontSize: '18px', color: '#4b5563' }}>
            Pay Period: {formatDate(payStatement.period_start)} - {formatDate(payStatement.period_end)}
          </div>
        </div>

        {/* Driver Information */}
        <div style={{ marginBottom: '32px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Driver Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: '500', color: '#374151' }}>Name:</div>
              <div style={{ fontSize: '18px', color: '#111827' }}>{driver.name}</div>
            </div>
            <div>
              <div style={{ fontWeight: '500', color: '#374151' }}>Phone:</div>
              <div style={{ fontSize: '18px', color: '#111827' }}>{driver.phone}</div>
            </div>
            <div>
              <div style={{ fontWeight: '500', color: '#374151' }}>Pay Rate:</div>
              <div style={{ fontSize: '18px', color: '#111827' }}>${driver.payRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mile</div>
            </div>
            <div>
              <div style={{ fontWeight: '500', color: '#374151' }}>Statement Date:</div>
              <div style={{ fontSize: '18px', color: '#111827' }}>{formatDate(payStatement.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        {trips.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Trip Details</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px', border: '1px solid #d1d5db', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d1d5db', color: '#111827', fontWeight: '600' }}>Trip#</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d1d5db', color: '#111827', fontWeight: '600' }}>Picked</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d1d5db', color: '#111827', fontWeight: '600' }}>From Location(s)</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d1d5db', color: '#111827', fontWeight: '600' }}>Drop</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d1d5db', color: '#111827', fontWeight: '600' }}>To Location(s)</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #d1d5db', color: '#111827', fontWeight: '600' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', color: '#111827' }}>{trip.trip_number}</td>
                      <td style={{ padding: '12px', color: '#111827' }}>{trip.picked_date}</td>
                      <td style={{ padding: '12px', maxWidth: '200px' }}>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '14px', color: '#111827' }}>{trip.from_city}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#111827' }}>{trip.drop_date}</td>
                      <td style={{ padding: '12px', maxWidth: '200px' }}>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '14px', color: '#111827' }}>{trip.to_city}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#111827' }}>{formatCurrency(trip.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pay Summary */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Pay Summary</h2>
          <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Gross Pay:</span>
                <span style={{ fontWeight: '600', color: '#059669' }}>{formatCurrency(payStatement.gross_pay)}</span>
              </div>
              
              {totalAdditions > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
                  <span style={{ fontWeight: '500', color: '#059669' }}>Additions:</span>
                  <span style={{ fontWeight: '600', color: '#059669' }}>+{formatCurrency(totalAdditions)}</span>
                </div>
              )}
              
              {totalDeductions > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
                  <span style={{ fontWeight: '500', color: '#dc2626' }}>Deductions:</span>
                  <span style={{ fontWeight: '600', color: '#dc2626' }}>-{formatCurrency(totalDeductions)}</span>
                </div>
              )}
              
              <hr style={{ border: 'none', borderTop: '1px solid #d1d5db', margin: '16px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: 'bold' }}>
                <span style={{ color: '#111827' }}>Net Pay:</span>
                <span style={{ color: '#2563eb' }}>{formatCurrency(netPay)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additions Details */}
        {Object.keys(payStatement.additions).length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Additions</h2>
            <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px' }}>
              {Object.entries(payStatement.additions).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ textTransform: 'capitalize', color: '#374151' }}>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span style={{ fontWeight: '600', color: '#059669' }}>{formatCurrency(value as number)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deductions Details */}
        {Object.keys(payStatement.deductions).length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Deductions</h2>
            <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px' }}>
              {Object.entries(payStatement.deductions).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ textTransform: 'capitalize', color: '#374151' }}>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span style={{ fontWeight: '600', color: '#dc2626' }}>-{formatCurrency(value as number)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {payStatement.notes && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Notes</h2>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
              <p style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: '1.6' }}>{payStatement.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #d1d5db', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
          <p>This pay statement was generated on {new Date().toLocaleDateString()}</p>
          <p style={{ marginTop: '8px' }}>Mini Dispatch Dashboard</p>
        </div>
      </div>
    </div>
  );
}
