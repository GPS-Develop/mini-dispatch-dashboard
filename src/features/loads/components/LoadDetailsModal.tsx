"use client";
import { useState, useEffect } from "react";
import { Load } from "../LoadContext";
import { Pickup, Delivery, LumperService } from "../../../types";
import { formatPhoneForDisplay, formatRateForDisplay } from "../../../utils/validation";
import { createClient } from "../../../utils/supabase/client";
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
  const [lumperService, setLumperService] = useState<LumperService | null>(null);
  const [loadingLumper, setLoadingLumper] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLumperService = async () => {
      try {
        const { data, error } = await supabase
          .from('lumper_services')
          .select('*')
          .eq('load_id', load.id)
          .maybeSingle();

        if (!error && data) {
          setLumperService(data);
        }
      } catch {
        // No lumper service exists - that's fine
      } finally {
        setLoadingLumper(false);
      }
    };

    fetchLumperService();
  }, [load.id, supabase]);

  const formatLumperInfo = () => {
    if (loadingLumper) return "Loading...";
    if (!lumperService) return "Not specified";

    if (lumperService.no_lumper) {
      return "No lumper required";
    }

    const payments = [];
    if (lumperService.paid_by_broker && lumperService.broker_amount) {
      payments.push(`Broker: $${lumperService.broker_amount}`);
    }
    if (lumperService.paid_by_company && lumperService.company_amount) {
      payments.push(`Company: $${lumperService.company_amount}`);
    }
    if (lumperService.paid_by_driver && lumperService.driver_amount) {
      payments.push(`Driver: $${lumperService.driver_amount}${lumperService.driver_payment_reason ? ` (${lumperService.driver_payment_reason})` : ''}`);
    }

    return payments.length > 0 ? payments.join(", ") : "No payment details";
  };

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
                    <strong>{p.name}</strong> - {p.address}, {p.city ? `${p.city}, ` : ''}{p.state} {p.postal_code} ({p.datetime})
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <span className="load-card-detail-label">Delivery:</span>
              <ol className="load-card-list">
                {deliveries.map((d, i) => (
                  <li key={d.id || i}>
                    <strong>{d.name}</strong> - {d.address}, {d.city ? `${d.city}, ` : ''}{d.state} {d.postal_code} ({d.datetime})
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
              <span className="load-card-detail-label">Lumper:</span> {formatLumperInfo()}
            </div>
            <div>
              <span className="load-card-detail-label">Notes:</span> {load.notes || <span className="text-muted">None</span>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="button-group button-group-full-width">
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
              className="delete-button-separated"
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