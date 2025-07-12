"use client";
import { Load } from "../LoadContext";
import { Pickup, Delivery } from "../../../types";
import { formatPhoneForDisplay, formatRateForDisplay } from "../../../utils/validation";
import Button from "../../../components/Button/Button";

interface LoadDetailsModalProps {
  load: Load;
  pickups: Pickup[];
  deliveries: Delivery[];
  getDriverName: (driverId: string) => string;
  onClose: () => void;
  onEdit: () => void;
  onUploadDocuments: () => void;
  onSetStatus: (status: "Scheduled" | "In-Transit" | "Delivered") => void;
  onDelete: () => void;
}

export function LoadDetailsModal({
  load,
  pickups,
  deliveries,
  getDriverName,
  onClose,
  onEdit,
  onUploadDocuments,
  onSetStatus,
  onDelete
}: LoadDetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <div className="modal-header">
          <h2 className="heading-lg">Load #{load.reference_id}</h2>
        </div>
        <div className="modal-body">
          <div className="space-y-4">
            <div>
              <span className="load-card-detail-label">Pickup:</span>
              <ol className="load-card-list">
                {pickups.map((p, i) => (
                  <li key={p.id || i}>
                    {p.address}, {p.city ? `${p.city}, ` : ''}{p.state} ({p.datetime})
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <span className="load-card-detail-label">Delivery:</span>
              <ol className="load-card-list">
                {deliveries.map((d, i) => (
                  <li key={d.id || i}>
                    {d.address}, {d.city ? `${d.city}, ` : ''}{d.state} ({d.datetime})
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <span className="load-card-detail-label">Driver:</span> {getDriverName(load.driver_id)}
            </div>
            <div>
              <span className="load-card-detail-label">Rate:</span> ${formatRateForDisplay(load.rate)}
            </div>
            <div>
              <span className="load-card-detail-label">Status:</span> {load.status}
            </div>
            <div>
              <span className="load-card-detail-label">Broker:</span> {load.broker_name}, {formatPhoneForDisplay(load.broker_contact)}, {load.broker_email}
            </div>
            <div>
              <span className="load-card-detail-label">Notes:</span> {load.notes || <span className="text-muted">None</span>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="button-group" style={{ width: '100%' }}>
            <Button
              variant="secondary"
              onClick={onEdit}
              aria-label="Edit load details"
            >
              Edit
            </Button>
            <Button
              variant="teal"
              onClick={onUploadDocuments}
              aria-label="Upload or view documents for this load"
            >
              📄 Upload/View Documents
            </Button>
            {load.status !== "Delivered" && (
              <Button
                variant="success"
                onClick={() => onSetStatus("Delivered")}
                aria-label="Mark load as delivered"
              >
                Mark as Delivered
              </Button>
            )}
            {load.status !== "In-Transit" && (
              <Button
                variant="warning"
                onClick={() => onSetStatus("In-Transit")}
                aria-label="Set load status to in-transit"
              >
                Set as In-Transit
              </Button>
            )}
            {load.status !== "Scheduled" && (
              <Button
                variant="indigo"
                onClick={() => onSetStatus("Scheduled")}
                aria-label="Set load status to scheduled"
              >
                Set as Scheduled
              </Button>
            )}
            <Button
              variant="danger"
              onClick={onDelete}
              style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}
              aria-label="Delete this load"
            >
              🗑️ Delete Load
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}