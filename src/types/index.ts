// Shared types across the application

// User role types
export type UserRole = 'admin' | 'driver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Pickup {
  id?: string;
  load_id: string;
  address: string;
  city: string;
  state: string;
  datetime: string;
}

export interface Delivery {
  id?: string;
  load_id: string;
  address: string;
  city: string;
  state: string;
  datetime: string;
}

export interface Broker {
  id: string;
  name: string;
  email?: string;
  contact?: number;
  created_at: string;
  updated_at: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface EditForm {
  driver_id: string;
  rate: number;
  notes: string;
  broker_name: string;
  broker_contact: number;
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
    city: string;
    state: string;
    datetime: string;
  }>;
  deliveries: Array<{
    address: string;
    city: string;
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

export interface Driver {
  id: string;
  name: string;
  phone: number;
  email?: string;
  status: "Available" | "On Load";
  payRate: number;
  scheduledLoads?: string[];
  inTransitLoads?: string[];
  driver_status?: "active" | "inactive";
  auth_user_id?: string;
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

export interface LoadDocument {
  id: string;
  load_id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  // Background processing fields (optional for backward compatibility)
  processing_status?: 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
}

// Event handler types
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type TextareaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;

// Driver Account Creation Form
export interface CreateDriverAccountForm {
  name: string;
  email: string;
  phone: string;
  payRate: number;
} 