import { toMinorUnits, fromMinorUnits, formatCurrency } from '../../src/common/utils/financial.utils';

describe('Financial Utils', () => {
  describe('toMinorUnits', () => {
    it('should convert LKR amounts correctly', () => {
      expect(toMinorUnits(100, 'LKR')).toBe(10000);
      expect(toMinorUnits(12.50, 'LKR')).toBe(1250);
      expect(toMinorUnits(0.01, 'LKR')).toBe(1);
      expect(toMinorUnits(1, 'LKR')).toBe(100);
    });

    it('should convert USD amounts correctly', () => {
      expect(toMinorUnits(25.99, 'USD')).toBe(2599);
      expect(toMinorUnits(100, 'USD')).toBe(10000);
    });

    it('should handle JPY with zero decimals', () => {
      expect(toMinorUnits(100, 'JPY')).toBe(100);
      expect(toMinorUnits(2500, 'JPY')).toBe(2500);
    });

    it('should handle KRW with zero decimals', () => {
      expect(toMinorUnits(1000, 'KRW')).toBe(1000);
    });

    it('should throw on negative amounts', () => {
      expect(() => toMinorUnits(-1, 'LKR')).toThrow();
    });

    it('should throw on NaN', () => {
      expect(() => toMinorUnits(NaN, 'LKR')).toThrow();
    });

    it('should handle zero', () => {
      expect(toMinorUnits(0, 'LKR')).toBe(0);
    });
  });

  describe('fromMinorUnits', () => {
    it('should convert LKR minor units correctly', () => {
      expect(fromMinorUnits(10000, 'LKR')).toBe(100);
      expect(fromMinorUnits(1250, 'LKR')).toBe(12.5);
      expect(fromMinorUnits(1, 'LKR')).toBe(0.01);
    });

    it('should convert JPY minor units correctly (zero decimals)', () => {
      expect(fromMinorUnits(100, 'JPY')).toBe(100);
      expect(fromMinorUnits(2500, 'JPY')).toBe(2500);
    });

    it('should throw on negative', () => {
      expect(() => fromMinorUnits(-1, 'LKR')).toThrow();
    });
  });

  describe('formatCurrency', () => {
    it('should format LKR amounts', () => {
      const result = formatCurrency(10000, 'LKR');
      expect(result).toContain('100');
    });

    it('should format zero', () => {
      const result = formatCurrency(0, 'LKR');
      expect(result).toContain('0');
    });
  });

  describe('round-trip conversion', () => {
    it('should round-trip LKR correctly', () => {
      const original = 125.75;
      const minor = toMinorUnits(original, 'LKR');
      const back = fromMinorUnits(minor, 'LKR');
      expect(back).toBe(original);
    });

    it('should handle large amounts', () => {
      const major = 1000000;
      const minor = toMinorUnits(major, 'LKR');
      expect(fromMinorUnits(minor, 'LKR')).toBe(major);
    });
  });
});
