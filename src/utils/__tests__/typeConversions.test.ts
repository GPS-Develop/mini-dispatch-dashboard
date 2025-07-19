import {
  convertDatabaseLoadToFrontend,
  convertFrontendLoadToDatabase,
  convertDatabaseDriverToFrontend,
  safeStringToNumber,
  safeStringToFloat
} from '../typeConversions';

describe('Type Conversions', () => {
  describe('safeStringToNumber', () => {
    it('converts valid string to number', () => {
      expect(safeStringToNumber('123')).toBe(123);
    });

    it('returns fallback for invalid string', () => {
      expect(safeStringToNumber('invalid', 0)).toBe(0);
    });

    it('returns number as-is', () => {
      expect(safeStringToNumber(456)).toBe(456);
    });
  });

  describe('safeStringToFloat', () => {
    it('converts valid string to float', () => {
      expect(safeStringToFloat('123.45')).toBe(123.45);
    });

    it('returns fallback for invalid string', () => {
      expect(safeStringToFloat('invalid', 0)).toBe(0);
    });

    it('returns number as-is', () => {
      expect(safeStringToFloat(456.78)).toBe(456.78);
    });
  });

  describe('Load conversions', () => {
    it('converts database load to frontend format', () => {
      const dbLoad = {
        id: '1',
        broker_contact: '1234567890',
        rate: 1000
      };

      const result = convertDatabaseLoadToFrontend(dbLoad as Parameters<typeof convertDatabaseLoadToFrontend>[0]);
      expect(result.broker_contact).toBe(1234567890);
      expect(typeof result.broker_contact).toBe('number');
    });

    it('converts frontend load to database format', () => {
      const frontendLoad = {
        id: '1',
        broker_contact: 1234567890,
        rate: 1000
      };

      const result = convertFrontendLoadToDatabase(frontendLoad);
      expect(result.broker_contact).toBe('1234567890');
      expect(typeof result.broker_contact).toBe('string');
    });
  });

  describe('Driver conversions', () => {
    it('converts database driver to frontend format', () => {
      const dbDriver = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        pay_rate: 50,
        status: 'Available' as const,
        driver_status: 'active' as const
      };

      const result = convertDatabaseDriverToFrontend(dbDriver);
      expect(result.phone).toBe(1234567890);
      expect(result.payRate).toBe(50);
      expect(typeof result.phone).toBe('number');
    });
  });
});