"use client";
import { useState } from "react";
import Button from '../../components/Button/Button';

export default function DriverMobileView() {
  const [showLocation, setShowLocation] = useState(false);
  const [showReefer, setShowReefer] = useState(false);
  const [showETA, setShowETA] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="page-container-sm">
      <div className="driver-load-card">
        <h1 className="heading-lg">Load #1345</h1>
        <div className="driver-load-info">
          <div><span className="font-semibold">Pickup:</span> Dallas, TX</div>
          <div><span className="font-semibold">Delivery:</span> Miami, FL</div>
        </div>
      <div className="driver-actions">
        {/* Update Location */}
        <Button
          onClick={() => setShowLocation((v) => !v)}
          variant="secondary"
        >
          <span className="text-lg">📍</span> Update Location
        </Button>
        {showLocation && (
          <input
            type="text"
            placeholder="Enter current location"
            className="input-field"
          />
        )}
        {/* Enter Reefer Temp */}
        <Button
          onClick={() => setShowReefer((v) => !v)}
          variant="secondary"
        >
          <span className="text-lg">❄️</span> Enter Reefer Temp
        </Button>
        {showReefer && (
          <input
            type="number"
            placeholder="Reefer Temp (°C)"
            className="input-field"
          />
        )}
        {/* Update ETA */}
        <Button
          onClick={() => setShowETA((v) => !v)}
          variant="secondary"
        >
          <span className="text-lg">⏱️</span> Update ETA
        </Button>
        {showETA && (
          <input
            type="datetime-local"
            className="input-field"
          />
        )}
        {/* Upload BOL or POD */}
        <Button
          onClick={() => setShowUpload((v) => !v)}
          variant="secondary"
        >
          <span className="text-lg">📤</span> Upload BOL or POD
        </Button>
        {showUpload && (
          <input
            type="file"
            className="input-field"
            accept="image/*,application/pdf"
          />
        )}
        <Button 
          variant="primary" 
          className="w-full"
        >
          Submit
        </Button>
      </div>
      </div>
    </div>
  );
} 