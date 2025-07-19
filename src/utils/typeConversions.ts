/**
 * Utility functions for consistent type conversions between frontend and database
 */

// Database types - what we get from/send to Supabase
export interface DatabaseLoad {
  id: string;
  reference_id: string;
  pickup_address: string;
  pickup_state: string;
  pickup_datetime: string;
  delivery_address: string;
  delivery_state: string;
  delivery_datetime: string;
  load_type: string;
  temperature?: number | null;
  rate: number;
  driver_id: string;
  notes?: string;
  broker_name: string;
  broker_contact: string; // bigint stored as string in database
  broker_email: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
  created_at?: string;
}

export interface DatabaseDriver {
  id: string;
  name: string;
  phone: string; // bigint stored as string in database
  email?: string;
  status: "Available" | "On Load";
  pay_rate: number;
  driver_status: "active" | "inactive";
  auth_user_id?: string;
  created_at?: string;
}

// Frontend types - what we use in components
export interface FrontendLoad {
  id: string;
  reference_id: string;
  pickup_address: string;
  pickup_state: string;
  pickup_datetime: string;
  delivery_address: string;
  delivery_state: string;
  delivery_datetime: string;
  load_type: string;
  temperature?: number | null;
  rate: number;
  driver_id: string;
  notes?: string;
  broker_name: string;
  broker_contact: number; // converted to number for frontend use
  broker_email: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
}

export interface FrontendDriver {
  id: string;
  name: string;
  phone: number; // converted to number for frontend use
  email?: string;
  status: "Available" | "On Load";
  payRate: number;
  driver_status: "active" | "inactive";
  scheduledLoads?: string[];
  inTransitLoads?: string[];
  auth_user_id?: string;
}

/**
 * Convert database load to frontend load
 */
export function convertDatabaseLoadToFrontend(dbLoad: DatabaseLoad): FrontendLoad {
  return {
    ...dbLoad,
    broker_contact: parseInt(dbLoad.broker_contact) || 0,
  };
}

/**
 * Convert frontend load to database load
 */
export function convertFrontendLoadToDatabase(frontendLoad: Partial<FrontendLoad>): Partial<DatabaseLoad> {
  const result: Partial<DatabaseLoad> = {};
  
  // Copy common properties
  if (frontendLoad.id !== undefined) result.id = frontendLoad.id;
  if (frontendLoad.reference_id !== undefined) result.reference_id = frontendLoad.reference_id;
  if (frontendLoad.pickup_address !== undefined) result.pickup_address = frontendLoad.pickup_address;
  if (frontendLoad.pickup_state !== undefined) result.pickup_state = frontendLoad.pickup_state;
  if (frontendLoad.pickup_datetime !== undefined) result.pickup_datetime = frontendLoad.pickup_datetime;
  if (frontendLoad.delivery_address !== undefined) result.delivery_address = frontendLoad.delivery_address;
  if (frontendLoad.delivery_state !== undefined) result.delivery_state = frontendLoad.delivery_state;
  if (frontendLoad.delivery_datetime !== undefined) result.delivery_datetime = frontendLoad.delivery_datetime;
  if (frontendLoad.load_type !== undefined) result.load_type = frontendLoad.load_type;
  if (frontendLoad.temperature !== undefined) result.temperature = frontendLoad.temperature;
  if (frontendLoad.rate !== undefined) result.rate = frontendLoad.rate;
  if (frontendLoad.driver_id !== undefined) result.driver_id = frontendLoad.driver_id;
  if (frontendLoad.notes !== undefined) result.notes = frontendLoad.notes;
  if (frontendLoad.broker_name !== undefined) result.broker_name = frontendLoad.broker_name;
  if (frontendLoad.broker_email !== undefined) result.broker_email = frontendLoad.broker_email;
  if (frontendLoad.status !== undefined) result.status = frontendLoad.status;
  
  // Convert broker_contact from number to string
  if (frontendLoad.broker_contact !== undefined) {
    result.broker_contact = frontendLoad.broker_contact.toString();
  }
  
  return result;
}

/**
 * Convert database driver to frontend driver
 */
export function convertDatabaseDriverToFrontend(dbDriver: DatabaseDriver): FrontendDriver {
  return {
    id: dbDriver.id,
    name: dbDriver.name,
    phone: parseInt(dbDriver.phone) || 0,
    email: dbDriver.email,
    status: dbDriver.status,
    payRate: dbDriver.pay_rate,
    driver_status: dbDriver.driver_status,
    auth_user_id: dbDriver.auth_user_id,
  };
}

/**
 * Convert frontend driver to database driver
 */
export function convertFrontendDriverToDatabase(frontendDriver: Partial<FrontendDriver>): Partial<DatabaseDriver> {
  const result: Partial<DatabaseDriver> = {};
  
  if (frontendDriver.id !== undefined) result.id = frontendDriver.id;
  if (frontendDriver.name !== undefined) result.name = frontendDriver.name;
  if (frontendDriver.phone !== undefined) result.phone = frontendDriver.phone.toString();
  if (frontendDriver.email !== undefined) result.email = frontendDriver.email;
  if (frontendDriver.status !== undefined) result.status = frontendDriver.status;
  if (frontendDriver.payRate !== undefined) result.pay_rate = frontendDriver.payRate;
  if (frontendDriver.driver_status !== undefined) result.driver_status = frontendDriver.driver_status;
  if (frontendDriver.auth_user_id !== undefined) result.auth_user_id = frontendDriver.auth_user_id;
  
  return result;
}

/**
 * Safely convert string to number, with fallback
 */
export function safeStringToNumber(value: string | number | null | undefined, fallback: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Safely convert string to float, with fallback
 */
export function safeStringToFloat(value: string | number | null | undefined, fallback: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}