import { FormErrors } from '../types';

// Email validation regex - more robust than simple pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Phone validation - supports US and international formats
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Sanitize string input
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Validate email
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

// Sanitize phone number - remove all non-numeric characters except leading +
export const sanitizePhone = (phone: string): string => {
  // Remove all non-numeric characters except + at the beginning
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep only the first + and remove any others
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.substring(1).replace(/\+/g, '');
  }
  
  return cleaned;
};

// Validate phone number (now expects numeric-only input)
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = sanitizePhone(phone);
  return PHONE_REGEX.test(cleanPhone);
};

// Format phone number for display (US format)
export const formatPhoneForDisplay = (phone: string | number): string => {
  const phoneStr = phone.toString();
  const cleaned = phoneStr.replace(/\D/g, '');
  
  // Handle different lengths
  if (cleaned.length === 10) {
    // US format: (555) 123-4567
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US with country code: +1 (555) 123-4567
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 6) {
    // International or other: format with spaces every 3 digits
    return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
  }
  
  return cleaned;
};

// Format rate for display (integer with comma separators)
export const formatRateForDisplay = (rate: number | string): string => {
  const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  const integerRate = Math.floor(numRate);
  return integerRate.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Validate positive number
export const validatePositiveNumber = (value: string): boolean => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && isFinite(num);
};

// Validate date string
export const validateDateTime = (dateTime: string): boolean => {
  const date = new Date(dateTime);
  return !isNaN(date.getTime()) && date > new Date();
};

// Validate required field
export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

// Validate and sanitize rate input (removes $ and validates - integers only)
export const validateRate = (rate: string | number): { isValid: boolean; sanitizedValue: number; error?: string } => {
  const rateStr = rate.toString();
  
  if (!rateStr || rateStr.trim() === '') {
    return { isValid: false, sanitizedValue: 0, error: 'Rate is required' };
  }
  
  // Remove $ sign and whitespace
  const sanitized = rateStr.replace(/[$\s,]/g, '');
  
  // Check if it's a valid positive number
  const num = parseFloat(sanitized);
  if (isNaN(num)) {
    return { isValid: false, sanitizedValue: 0, error: 'Rate must be a valid number' };
  }
  
  if (num <= 0) {
    return { isValid: false, sanitizedValue: 0, error: 'Rate must be greater than 0' };
  }
  
  if (!isFinite(num)) {
    return { isValid: false, sanitizedValue: 0, error: 'Rate must be a finite number' };
  }
  
  // Check if it's a whole number (no decimals allowed)
  if (num !== Math.floor(num)) {
    return { isValid: false, sanitizedValue: 0, error: 'Rate must be a whole number (no decimals)' };
  }
  
  // Return as integer
  return { isValid: true, sanitizedValue: Math.floor(num) };
};

// Validate temperature (allows positive and negative numbers)
export const validateTemperature = (temperature: string): { isValid: boolean; sanitizedValue: number | null; error?: string } => {
  if (!temperature || temperature.trim() === '') {
    return { isValid: false, sanitizedValue: null, error: 'Temperature is required for reefer loads' };
  }
  
  // Remove any whitespace and convert to number
  const sanitized = temperature.trim();
  const num = parseFloat(sanitized);
  
  if (isNaN(num)) {
    return { isValid: false, sanitizedValue: null, error: 'Temperature must be a valid number' };
  }
  
  if (!isFinite(num)) {
    return { isValid: false, sanitizedValue: null, error: 'Temperature must be a finite number' };
  }
  
  // Reasonable temperature range check (-100°F to 200°F)
  if (num < -100 || num > 200) {
    return { isValid: false, sanitizedValue: null, error: 'Temperature must be between -100°F and 200°F' };
  }
  
  // Round to 1 decimal place for precision
  const rounded = Math.round(num * 10) / 10;
  
  return { isValid: true, sanitizedValue: rounded };
};

// Driver form validation
export const validateDriverForm = (form: {
  name: string;
  phone: string;
  payRate: string;
}): FormErrors => {
  const errors: FormErrors = {};

  if (!validateRequired(form.name)) {
    errors.name = 'Name is required';
  }

  if (!validateRequired(form.phone)) {
    errors.phone = 'Phone is required';
  } else if (!validatePhone(form.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (!validateRequired(form.payRate)) {
    errors.payRate = 'Pay rate is required';
  } else if (!validatePositiveNumber(form.payRate)) {
    errors.payRate = 'Pay rate must be a positive number';
  }

  return errors;
};

// Load form validation
export const validateLoadForm = (form: {
  referenceId: string;
  pickups: Array<{ address: string; state: string; datetime: string }>;
  deliveries: Array<{ address: string; state: string; datetime: string }>;
  loadType: string;
  temperature: string;
  rate: string;
  driver: string;
  brokerName: string;
  brokerContact: string;
  brokerEmail: string;
}): FormErrors => {
  const errors: FormErrors = {};

  // Reference ID validation
  if (!validateRequired(form.referenceId)) {
    errors.referenceId = 'Reference ID is required';
  } else if (!/^\d+$/.test(form.referenceId)) {
    errors.referenceId = 'Reference ID must be a number';
  }

  // Pickup validation
  form.pickups.forEach((pickup, index) => {
    if (!validateRequired(pickup.address)) {
      errors[`pickupAddress${index}`] = 'Address is required';
    }
    if (!validateRequired(pickup.state)) {
      errors[`pickupState${index}`] = 'State is required';
    }
    if (!validateRequired(pickup.datetime)) {
      errors[`pickupDatetime${index}`] = 'Date and time are required';
    } else if (!validateDateTime(pickup.datetime)) {
      errors[`pickupDatetime${index}`] = 'Please enter a valid future date and time';
    }
  });

  // Delivery validation
  form.deliveries.forEach((delivery, index) => {
    if (!validateRequired(delivery.address)) {
      errors[`deliveryAddress${index}`] = 'Address is required';
    }
    if (!validateRequired(delivery.state)) {
      errors[`deliveryState${index}`] = 'State is required';
    }
    if (!validateRequired(delivery.datetime)) {
      errors[`deliveryDatetime${index}`] = 'Date and time are required';
    } else if (!validateDateTime(delivery.datetime)) {
      errors[`deliveryDatetime${index}`] = 'Please enter a valid future date and time';
    }
  });

  // Load type validation
  if (!validateRequired(form.loadType)) {
    errors.loadType = 'Load type is required';
  }

  // Temperature validation for reefer loads
  if (form.loadType === 'Reefer') {
    const tempValidation = validateTemperature(form.temperature);
    if (!tempValidation.isValid) {
      errors.temperature = tempValidation.error || 'Invalid temperature';
    }
  }

  // Rate validation
  const rateValidation = validateRate(form.rate);
  if (!rateValidation.isValid) {
    errors.rate = rateValidation.error || 'Invalid rate';
  }

  // Driver validation
  if (!validateRequired(form.driver)) {
    errors.driver = 'Driver is required';
  }

  // Broker validation
  if (!validateRequired(form.brokerName)) {
    errors.brokerName = 'Broker name is required';
  }

  if (!validateRequired(form.brokerContact)) {
    errors.brokerContact = 'Broker contact is required';
  } else if (!validatePhone(form.brokerContact)) {
    errors.brokerContact = 'Please enter a valid phone number';
  }

  if (!validateRequired(form.brokerEmail)) {
    errors.brokerEmail = 'Broker email is required';
  } else if (!validateEmail(form.brokerEmail)) {
    errors.brokerEmail = 'Please enter a valid email address';
  }

  return errors;
}; 