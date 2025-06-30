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
  rate: number;
  notes: string;
  broker_name: string;
  broker_contact: string;
  broker_email: string;
  load_type: string;
  temperature: number | null;
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
  temperature: number | null;
  rate: number;
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
  payRate: number;
}

// Pay Statement Types
export interface PayStatement {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  additions: Record<string, number>;
  deductions: Record<string, number>;
  notes?: string;
  created_at: string;
}

export interface PayStatementDB {
  id?: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  additions: Record<string, number>;
  deductions: Record<string, number>;
  notes?: string;
  created_at?: string;
}

export interface PayStatementForm {
  driver_id: string;
  period_start: string;
  period_end: string;
  additions: Record<string, number>;
  deductions: Record<string, number>;
  notes: string;
}

export interface TripSummary {
  trip_number: string;
  picked_date: string;
  from_city: string;
  drop_date: string;
  to_city: string;
  amount: number;
}

// Event handler types
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type TextareaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>; 