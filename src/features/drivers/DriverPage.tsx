"use client";
import { useState } from "react";
import Button from '../../components/Button/Button';

export default function DriverMobileView() {
  const [showLocation, setShowLocation] = useState(false);
  const [showReefer, setShowReefer] = useState(false);
  const [showETA, setShowETA] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-lg mt-8 mb-8 font-sans">
      <h1 className="text-2xl font-bold mb-1 tracking-tight text-gray-900">Load #1345</h1>
      <div className="mb-5 text-base text-gray-700 space-y-1">
        <div><span className="font-semibold text-gray-800">Pickup:</span> Dallas, TX</div>
        <div><span className="font-semibold text-gray-800">Delivery:</span> Miami, FL</div>
      </div>
      <div className="flex flex-col gap-3">
        {/* Update Location */}
        <Button
          className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-gray-50 hover:bg-gray-100 text-base font-medium text-gray-800 transition"
          onClick={() => setShowLocation((v) => !v)}
          variant="primary"
        >
          <span className="text-lg">📍</span> Update Location
        </Button>
        {showLocation && (
          <input
            type="text"
            placeholder="Enter current location"
            className="w-full mt-2 mb-2 border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
        {/* Enter Reefer Temp */}
        <Button
          className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-gray-50 hover:bg-gray-100 text-base font-medium text-gray-800 transition"
          onClick={() => setShowReefer((v) => !v)}
          variant="primary"
        >
          <span className="text-lg">❄️</span> Enter Reefer Temp
        </Button>
        {showReefer && (
          <input
            type="number"
            placeholder="Reefer Temp (°C)"
            className="w-full mt-2 mb-2 border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
        {/* Update ETA */}
        <Button
          className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-gray-50 hover:bg-gray-100 text-base font-medium text-gray-800 transition"
          onClick={() => setShowETA((v) => !v)}
          variant="primary"
        >
          <span className="text-lg">⏱️</span> Update ETA
        </Button>
        {showETA && (
          <input
            type="datetime-local"
            className="w-full mt-2 mb-2 border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
        {/* Upload BOL or POD */}
        <Button
          className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-gray-50 hover:bg-gray-100 text-base font-medium text-gray-800 transition"
          onClick={() => setShowUpload((v) => !v)}
          variant="primary"
        >
          <span className="text-lg">📤</span> Upload BOL or POD
        </Button>
        {showUpload && (
          <input
            type="file"
            className="w-full mt-2 mb-2 border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            accept="image/*,application/pdf"
          />
        )}
        <button className="mt-4 w-full bg-gray-900 text-white rounded-lg px-4 py-2 font-semibold text-base hover:bg-gray-800 transition">Submit</button>
      </div>
    </div>
  );
} 