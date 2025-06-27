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
  return !isNaN(num) && num > 0;
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
    if (!validateRequired(form.temperature)) {
      errors.temperature = 'Temperature is required for reefer loads';
    } else if (isNaN(parseFloat(form.temperature))) {
      errors.temperature = 'Temperature must be a valid number';
    }
  }

  // Rate validation
  if (!validateRequired(form.rate)) {
    errors.rate = 'Rate is required';
  } else if (!validatePositiveNumber(form.rate)) {
    errors.rate = 'Rate must be a positive number';
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