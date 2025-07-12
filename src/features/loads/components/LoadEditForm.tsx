"use client";
import { Load } from "../LoadContext";
import { Driver } from "../../drivers/DriverContext";
import { Pickup, Delivery, InputChangeEvent, SelectChangeEvent, TextareaChangeEvent, FormSubmitEvent } from "../../../types";
import { US_STATES } from "../../../utils/constants";
import Button from "../../../components/Button/Button";

interface LoadEditForm {
  id: string;
  reference_id: string;
  driver_id: string;
  rate: number;
  notes?: string;
  broker_name: string;
  broker_contact: number;
  broker_email: string;
  load_type: string;
  temperature?: number | null;
  pickups: Pickup[];
  deliveries: Delivery[];
  pickup_address: string;
  pickup_state: string;
  pickup_datetime: string;
  delivery_address: string;
  delivery_state: string;
  delivery_datetime: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
}

interface LoadEditFormProps {
  load: Load;
  editForm: LoadEditForm;
  drivers: Driver[];
  isSubmitting: boolean;
  onFormChange: (e: InputChangeEvent | SelectChangeEvent | TextareaChangeEvent) => void;
  onPickupChange: (idx: number, e: InputChangeEvent | SelectChangeEvent) => void;
  onDeliveryChange: (idx: number, e: InputChangeEvent | SelectChangeEvent) => void;
  onSubmit: (e: FormSubmitEvent) => void;
  onCancel: () => void;
}

export function LoadEditForm({
  load,
  editForm,
  drivers,
  isSubmitting,
  onFormChange,
  onPickupChange,
  onDeliveryChange,
  onSubmit,
  onCancel
}: LoadEditFormProps) {
  return (
    <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
      <button
        className="modal-close-btn"
        onClick={onCancel}
        aria-label="Close edit form"
      >
        ×
      </button>
      <form className="form-container" onSubmit={onSubmit}>
        <div className="modal-header">
          <h2 className="heading-lg">Edit Load #{load.reference_id}</h2>
        </div>
        <div className="modal-body">
          {/* Pickups */}
          <div className="edit-form-section">
            <div className="edit-form-section-title">Pickup Locations</div>
            {editForm.pickups && editForm.pickups.length > 0 && editForm.pickups.map((pickup: Pickup, idx: number) => (
              <div key={pickup.id || idx} className="edit-form-item">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="label-text">Address</label>
                    <input
                      name="address"
                      value={pickup.address}
                      onChange={e => onPickupChange(idx, e)}
                      className="input-field"
                      placeholder="Pickup Address"
                      aria-label={`Pickup ${idx + 1} address`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">City</label>
                    <input
                      name="city"
                      value={pickup.city || ''}
                      onChange={e => onPickupChange(idx, e)}
                      className="input-field"
                      placeholder="Pickup City"
                      aria-label={`Pickup ${idx + 1} city`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">State</label>
                    <select
                      name="state"
                      value={pickup.state}
                      onChange={e => onPickupChange(idx, e)}
                      className="input-field"
                      aria-label={`Pickup ${idx + 1} state`}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label-text">Date & Time</label>
                    <input
                      type="datetime-local"
                      name="datetime"
                      value={pickup.datetime ? pickup.datetime.slice(0, 16) : ''}
                      onChange={e => onPickupChange(idx, e)}
                      className="input-field"
                      placeholder="Pickup Date & Time"
                      aria-label={`Pickup ${idx + 1} date and time`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Deliveries */}
          <div className="edit-form-section">
            <div className="edit-form-section-title">Delivery Locations</div>
            {editForm.deliveries && editForm.deliveries.length > 0 && editForm.deliveries.map((delivery: Delivery, idx: number) => (
              <div key={delivery.id || idx} className="edit-form-item">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="label-text">Address</label>
                    <input
                      name="address"
                      value={delivery.address}
                      onChange={e => onDeliveryChange(idx, e)}
                      className="input-field"
                      placeholder="Delivery Address"
                      aria-label={`Delivery ${idx + 1} address`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">City</label>
                    <input
                      name="city"
                      value={delivery.city || ''}
                      onChange={e => onDeliveryChange(idx, e)}
                      className="input-field"
                      placeholder="Delivery City"
                      aria-label={`Delivery ${idx + 1} city`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">State</label>
                    <select
                      name="state"
                      value={delivery.state}
                      onChange={e => onDeliveryChange(idx, e)}
                      className="input-field"
                      aria-label={`Delivery ${idx + 1} state`}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label-text">Date & Time</label>
                    <input
                      type="datetime-local"
                      name="datetime"
                      value={delivery.datetime ? delivery.datetime.slice(0, 16) : ''}
                      onChange={e => onDeliveryChange(idx, e)}
                      className="input-field"
                      placeholder="Delivery Date & Time"
                      aria-label={`Delivery ${idx + 1} date and time`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Load Details */}
          <div className="edit-form-section">
            <div className="edit-form-section-title">Load Details</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="label-text">Driver</label>
                <select 
                  name="driver_id" 
                  value={editForm.driver_id} 
                  onChange={onFormChange} 
                  className="input-field"
                  aria-label="Select driver for this load"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label-text">Rate ($)</label>
                <input 
                  name="rate" 
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.rate || ""} 
                  onChange={onFormChange} 
                  className="input-field"
                  placeholder="2500"
                  aria-label="Load rate in dollars"
                />
              </div>
              <div className="form-group">
                <label className="label-text">Load Type</label>
                <select 
                  name="load_type" 
                  value={editForm.load_type} 
                  onChange={onFormChange} 
                  className="input-field"
                  aria-label="Select load type"
                >
                  <option value="Reefer">Reefer</option>
                  <option value="Dry Van">Dry Van</option>
                  <option value="Flatbed">Flatbed</option>
                </select>
              </div>
              {editForm.load_type === "Reefer" && (
                <div className="form-group">
                  <label className="label-text">Temperature (°F)</label>
                  <input 
                    name="temperature" 
                    type="number"
                    step="0.1"
                    min="-100"
                    max="200"
                    value={editForm.temperature || ""} 
                    onChange={onFormChange} 
                    className="input-field"
                    placeholder="e.g., -10, 35, 72"
                    aria-label="Temperature in Fahrenheit for reefer loads"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Broker Information */}
          <div className="edit-form-section">
            <div className="edit-form-section-title">Broker Information</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="label-text">Broker Name</label>
                <input 
                  name="broker_name" 
                  value={editForm.broker_name} 
                  onChange={onFormChange} 
                  className="input-field"
                  aria-label="Broker company name"
                />
              </div>
              <div className="form-group">
                <label className="label-text">Broker Contact</label>
                <input 
                  name="broker_contact" 
                  type="tel"
                  value={editForm.broker_contact?.toString() || ""} 
                  onChange={onFormChange} 
                  className="input-field"
                  placeholder="(555) 123-4567"
                  aria-label="Broker contact phone number"
                />
                <div className="text-hint">Enter phone number (formatting will be removed)</div>
              </div>
              <div className="form-group">
                <label className="label-text">Broker Email</label>
                <input 
                  name="broker_email" 
                  type="email"
                  value={editForm.broker_email} 
                  onChange={onFormChange} 
                  className="input-field"
                  aria-label="Broker email address"
                />
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="edit-form-section">
            <div className="form-group">
              <label className="label-text">Notes</label>
              <textarea 
                name="notes" 
                value={editForm.notes || ""} 
                onChange={onFormChange} 
                className="input-field" 
                rows={3}
                aria-label="Additional notes for this load"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="button-group-horizontal">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onCancel}
              aria-label="Cancel editing and close form"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              aria-label="Save changes to the load"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}