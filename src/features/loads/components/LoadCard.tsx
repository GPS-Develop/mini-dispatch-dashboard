"use client";
import { Load } from "../LoadContext";
import { Pickup, Delivery } from "../../../types";
import { formatRateForDisplay } from "../../../utils/validation";

interface LoadCardProps {
  load: Load;
  pickups: Pickup[];
  deliveries: Delivery[];
  getDriverName: (driverId: string) => string;
  onClick: () => void;
}

export function LoadCard({ load, pickups, deliveries, getDriverName, onClick }: LoadCardProps) {
  return (
    <div
      className="load-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for Load #${load.reference_id}`}
    >
      <div className="load-card-title">Load #{load.reference_id}</div>
      <div className="load-card-detail">
        <span className="load-card-detail-label">Pickup:</span>
        <ol className="load-card-list">
          {pickups.map((p, i) => (
            <li key={p.id || i}>
              {p.address}, {p.city ? `${p.city}, ` : ''}{p.state} ({p.datetime})
            </li>
          ))}
        </ol>
      </div>
      <div className="load-card-detail">
        <span className="load-card-detail-label">Delivery:</span>
        <ol className="load-card-list">
          {deliveries.map((d, i) => (
            <li key={d.id || i}>
              {d.address}, {d.city ? `${d.city}, ` : ''}{d.state} ({d.datetime})
            </li>
          ))}
        </ol>
      </div>
      <div className="load-card-detail">
        <span className="load-card-detail-label">Driver:</span> {getDriverName(load.driver_id)}
      </div>
      <div className="load-card-detail">
        <span className="load-card-detail-label">Rate:</span> ${formatRateForDisplay(load.rate)}
      </div>
      <div className="load-card-detail">
        <span className="load-card-detail-label">Status:</span> {load.status}
      </div>
    </div>
  );
}