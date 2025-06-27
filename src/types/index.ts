// Shared types across the application

export interface Pickup {
  id?: string;
  load_id: string;
  address: string;
  state: string;
  datetime: string;
}

export interface Delivery {
  id?: string;
  load_id: string;
  address: string;
  state: string;
  datetime: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface EditForm {
  driver_id: string;
  rate: string;
  notes: string;
  broker_name: string;
  broker_contact: string;
  broker_email: string;
  load_type: string;
  temperature: string;
  pickups: Pickup[];
  deliveries: Delivery[];
}

export interface AddLoadForm {
  referenceId: string;
  pickups: Array<{
    address: string;
    state: string;
    datetime: string;
  }>;
  deliveries: Array<{
    address: string;
    state: string;
    datetime: string;
  }>;
  loadType: string;
  temperature: string;
  rate: string;
  driver: string;
  notes: string;
  brokerName: string;
  brokerContact: string;
  brokerEmail: string;
}

export interface DriverForm {
  name: string;
  phone: string;
  status: "Available" | "On Load";
  payRate: string;
}

// Event handler types
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type TextareaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>; 