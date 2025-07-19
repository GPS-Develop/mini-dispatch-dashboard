import { sanitizePhone, validateDriverPayRate } from '../validation';

describe('Validation Utils', () => {
  describe('sanitizePhone', () => {
    it('should clean phone number with spaces and dashes', () => {
      expect(sanitizePhone('123-456-7890')).toBe('1234567890');
    });

    it('should clean phone number with parentheses', () => {
      expect(sanitizePhone('(123) 456-7890')).toBe('1234567890');
    });

    it('should handle phone with +1 country code', () => {
      expect(sanitizePhone('+1 123 456 7890')).toBe('+11234567890');
    });

    it('should return original if already clean', () => {
      expect(sanitizePhone('1234567890')).toBe('1234567890');
    });

    it('should handle empty string', () => {
      expect(sanitizePhone('')).toBe('');
    });
  });

  describe('validateDriverPayRate', () => {
    it('should validate positive numbers', () => {
      const result = validateDriverPayRate(25.50);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(25.50);
    });

    it('should reject negative numbers', () => {
      const result = validateDriverPayRate(-10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject zero', () => {
      const result = validateDriverPayRate(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should handle string numbers', () => {
      const result = validateDriverPayRate('30.00');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(30.00);
    });

    it('should reject invalid strings', () => {
      const result = validateDriverPayRate('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid number');
    });

    it('should accept high pay rates', () => {
      const result = validateDriverPayRate(10000);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(10000);
    });
  });
});