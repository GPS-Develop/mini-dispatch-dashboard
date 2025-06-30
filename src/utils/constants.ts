// US States
export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

// Load statuses
export const LOAD_STATUSES = ["Scheduled", "In-Transit", "Delivered"] as const;
export const LOAD_STATUS_FILTER_OPTIONS = ["All", ...LOAD_STATUSES] as const;

// Driver statuses
export const DRIVER_STATUSES = ["Available", "On Load"] as const;
export const DRIVER_STATUS_OPTIONS = ["active", "inactive"] as const;

// Load types
export const LOAD_TYPES = ["Reefer", "Dry Van", "Flatbed"] as const;

// Navigation items
export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/drivers", label: "Drivers" },
  { href: "/loads", label: "Loads" },
  { href: "/add-load", label: "Add Load" },
  { href: "/pay-statements", label: "Pay Statements" },
] as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  DRIVER_ADDED: "Driver added successfully",
  DRIVER_UPDATED: "Driver updated successfully",
  DRIVER_DEACTIVATED: "Driver deactivated successfully",
  DRIVER_REACTIVATED: "Driver reactivated successfully",
  LOAD_ADDED: "Load added successfully",
  LOAD_UPDATED: "Load updated successfully",
  LOAD_STATUS_UPDATED: "Load status updated successfully",
} as const; 