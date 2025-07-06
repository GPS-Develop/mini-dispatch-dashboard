"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePayStatements } from "./PayStatementContext";
import { useDrivers } from "../drivers/DriverContext";
import Button from '../../components/Button/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './ViewPayStatementPage.module.css';
import { PayStatement, TripSummary } from '../../types';

interface ViewPayStatementPageProps {
  payStatementId: string;
}

export default function ViewPayStatementPage({ payStatementId }: ViewPayStatementPageProps) {
  const { payStatements, calculateGrossPay, loading, error } = usePayStatements();
  const { drivers } = useDrivers();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [payStatement, setPayStatement] = useState<PayStatement | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
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
    
    const totalAdditions = Object.values(payStatement.additions).reduce((sum: number, val: number) => sum + val, 0);
    const totalDeductions = Object.values(payStatement.deductions).reduce((sum: number, val: number) => sum + val, 0);
    const netPay = payStatement.gross_pay + totalAdditions - totalDeductions;

    return { totalAdditions, totalDeductions, netPay };
  }

  const generatePDF = async () => {
    if (!printRef.current || !payStatement || !driver) {
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
      <div className="page-container-lg">
        <div className="loading-container">
          <div className="text-muted">Loading pay statement...</div>
        </div>
      </div>
    );
  }

  if (error || !payStatement || !driver) {
    return (
      <div className="page-container-lg">
        <div className="loading-container">
          <div className="alert-error">Pay statement not found or failed to load.</div>
          <Button 
            variant="secondary" 
            onClick={() => router.push("/pay-statements")}
          >
            Back to Pay Statements
          </Button>
        </div>
      </div>
    );
  }

  const { totalAdditions, totalDeductions, netPay } = calculateTotals();

  return (
    <div className="page-container-lg">
      {/* Action Buttons */}
      <div className="page-header print:hidden">
        <Button 
          variant="secondary" 
          onClick={() => router.push("/pay-statements")}
        >
          ← Back to Pay Statements
        </Button>
        <Button 
          variant="primary" 
          onClick={generatePDF}
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Printable Content */}
      <div 
        ref={printRef} 
        className={`pay-statement-container pay-statement-print ${styles.payStatementContainer}`}
      >
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>PAY STATEMENT</h1>
          <div className={styles.headerSubtitle}>
            Pay Period: {formatDate(payStatement.period_start)} - {formatDate(payStatement.period_end)}
          </div>
        </div>

        {/* Driver Information */}
        <div className={`${styles.section} ${styles.driverInfoSection}`}>
          <h2 className={styles.sectionTitle}>Driver Information</h2>
          <div className={styles.driverGrid}>
            <div>
              <div className={styles.driverLabel}>Name:</div>
              <div className={styles.driverValue}>{driver.name}</div>
            </div>
            <div>
              <div className={styles.driverLabel}>Phone:</div>
              <div className={styles.driverValue}>{driver.phone}</div>
            </div>
            <div>
              <div className={styles.driverLabel}>Pay Rate:</div>
              <div className={styles.driverValue}>${driver.payRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mile</div>
            </div>
            <div>
              <div className={styles.driverLabel}>Statement Date:</div>
              <div className={styles.driverValue}>{formatDate(payStatement.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        {trips.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Trip Details</h2>
            
            {/* Desktop Table View */}
            <div className={styles.tableContainer}>
              <table className={styles.tripsTable}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>Trip#</th>
                    <th className={styles.tableHeaderCell}>Picked</th>
                    <th className={styles.tableHeaderCell}>From Location(s)</th>
                    <th className={styles.tableHeaderCell}>Drop</th>
                    <th className={styles.tableHeaderCell}>To Location(s)</th>
                    <th className={styles.tableHeaderCellRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip, index) => (
                    <tr key={index} className={styles.tableRow}>
                      <td className={styles.tableCell}>{trip.trip_number}</td>
                      <td className={styles.tableCell}>{trip.picked_date}</td>
                      <td className={styles.tableCellMaxWidth}>
                        <div className={styles.tableCellContent}>{trip.from_city}</div>
                      </td>
                      <td className={styles.tableCell}>{trip.drop_date}</td>
                      <td className={styles.tableCellMaxWidth}>
                        <div className={styles.tableCellContent}>{trip.to_city}</div>
                      </td>
                      <td className={styles.tableCellRight}>{formatCurrency(trip.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className={styles.tripCards}>
              {trips.map((trip, index) => (
                <div key={index} className={styles.tripCard}>
                  <div className={styles.tripCardHeader}>
                    <div className={styles.tripCardNumber}>Trip #{trip.trip_number}</div>
                    <div className={styles.tripCardAmount}>{formatCurrency(trip.amount)}</div>
                  </div>
                  
                  <div className={styles.tripCardDetails}>
                    <div className={styles.tripCardDetail}>
                      <div className={styles.tripCardDetailLabel}>Picked</div>
                      <div className={styles.tripCardDetailValue}>{trip.picked_date}</div>
                    </div>
                    <div className={styles.tripCardDetail}>
                      <div className={styles.tripCardDetailLabel}>Drop</div>
                      <div className={styles.tripCardDetailValue}>{trip.drop_date}</div>
                    </div>
                  </div>
                  
                  <div className={styles.tripCardLocations}>
                    <div className={styles.tripCardLocation}>
                      <div className={styles.tripCardLocationLabel}>From Location(s)</div>
                      <div className={styles.tripCardLocationValue}>{trip.from_city}</div>
                    </div>
                    <div className={styles.tripCardLocation}>
                      <div className={styles.tripCardLocationLabel}>To Location(s)</div>
                      <div className={styles.tripCardLocationValue}>{trip.to_city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pay Summary */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Pay Summary</h2>
          <div className={styles.paySummaryContainer}>
            <div className={styles.paySummaryGrid}>
              <div className={styles.paySummaryRow}>
                <span className={styles.paySummaryLabel}>Gross Pay:</span>
                <span className={styles.paySummaryValue}>{formatCurrency(payStatement.gross_pay)}</span>
              </div>
              
              {totalAdditions > 0 && (
                <div className={styles.paySummaryRow}>
                  <span className={styles.paySummaryValue}>Additions:</span>
                  <span className={styles.paySummaryValue}>+{formatCurrency(totalAdditions)}</span>
                </div>
              )}
              
              {totalDeductions > 0 && (
                <div className={styles.paySummaryRow}>
                  <span className={styles.paySummaryValueDeduction}>Deductions:</span>
                  <span className={styles.paySummaryValueDeduction}>-{formatCurrency(totalDeductions)}</span>
                </div>
              )}
              
              <hr className={styles.paySummaryDivider} />
              
              <div className={styles.paySummaryTotal}>
                <span className={styles.paySummaryTotalLabel}>Net Pay:</span>
                <span className={styles.paySummaryTotalValue}>{formatCurrency(netPay)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additions Details */}
        {Object.keys(payStatement.additions).length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Additions</h2>
            <div className={styles.additionsContainer}>
              {Object.entries(payStatement.additions).map(([key, value]) => (
                <div key={key} className={styles.additionsRow}>
                  <span className={styles.additionsLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className={styles.additionsValue}>{formatCurrency(value as number)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deductions Details */}
        {Object.keys(payStatement.deductions).length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Deductions</h2>
            <div className={styles.deductionsContainer}>
              {Object.entries(payStatement.deductions).map(([key, value]) => (
                <div key={key} className={styles.deductionsRow}>
                  <span className={styles.deductionsLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className={styles.deductionsValue}>-{formatCurrency(value as number)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {payStatement.notes && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Notes</h2>
            <div className={styles.notesContainer}>
              <p className={styles.notesText}>{payStatement.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <p>This pay statement was generated on {new Date().toLocaleDateString()}</p>
          <p className={styles.footerText}>Mini Dispatch Dashboard</p>
        </div>
      </div>
    </div>
  );
}
