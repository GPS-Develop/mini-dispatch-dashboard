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

// Validate phone number
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return PHONE_REGEX.test(cleanPhone);
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

// Validate and sanitize rate input (removes $ and validates)
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
  
  // Limit to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  
  return { isValid: true, sanitizedValue: rounded };
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