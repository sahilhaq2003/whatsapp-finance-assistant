import { ReportPeriodService } from '../../src/modules/reports/services/report-period.service';
import { ReportPeriod } from '../../src/modules/reports/enums/report-period.enum';

describe('ReportPeriodService', () => {
  let service: ReportPeriodService;

  beforeEach(() => {
    service = new ReportPeriodService();
  });

  describe('Preset periods', () => {
    it('should resolve this_month correctly', () => {
      const result = service.resolve(ReportPeriod.THIS_MONTH, undefined, undefined, 'Asia/Colombo');
      const now = new Date();
      expect(result.startDate.getMonth()).toBe(now.getMonth());
      expect(result.startDate.getFullYear()).toBe(now.getFullYear());
      expect(result.label).toBe('This Month');
    });

    it('should resolve last_month correctly', () => {
      const result = service.resolve(ReportPeriod.LAST_MONTH, undefined, undefined, 'Asia/Colombo');
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      expect(result.startDate.getMonth()).toBe(lastMonth.getMonth());
      expect(result.label).toBe('Last Month');
    });

    it('should resolve this_year correctly', () => {
      const result = service.resolve(ReportPeriod.THIS_YEAR, undefined, undefined, 'Asia/Colombo');
      expect(result.startDate.getMonth()).toBe(0);
      expect(result.startDate.getDate()).toBe(1);
      expect(result.label).toBe('This Year');
    });

    it('should default to this_month when no period specified', () => {
      const result = service.resolve(undefined, undefined, undefined, 'Asia/Colombo');
      expect(result.label).toBe('This Month');
    });
  });

  describe('Custom date range', () => {
    it('should resolve custom date range', () => {
      const result = service.resolve(
        ReportPeriod.CUSTOM,
        '2026-08-01',
        '2026-08-17',
        'Asia/Colombo',
      );
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.label).toContain('2026-08-01');
    });

    it('should throw when dateFrom is missing for custom', () => {
      expect(() =>
        service.resolve(ReportPeriod.CUSTOM, undefined, '2026-08-17', 'Asia/Colombo'),
      ).toThrow();
    });

    it('should throw when dateTo is missing for custom', () => {
      expect(() =>
        service.resolve(ReportPeriod.CUSTOM, '2026-08-01', undefined, 'Asia/Colombo'),
      ).toThrow();
    });

    it('should throw when dateFrom > dateTo', () => {
      expect(() =>
        service.resolve(ReportPeriod.CUSTOM, '2026-08-20', '2026-08-01', 'Asia/Colombo'),
      ).toThrow();
    });
  });

  describe('Trend granularity', () => {
    it('should use daily for short ranges', () => {
      const start = new Date('2026-08-01');
      const end = new Date('2026-08-17');
      expect(service.getTrendGranularity(start, end)).toBe('day');
    });

    it('should use weekly for medium ranges', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-06-30');
      expect(service.getTrendGranularity(start, end)).toBe('week');
    });

    it('should use monthly for long ranges', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2026-08-17');
      expect(service.getTrendGranularity(start, end)).toBe('month');
    });
  });
});
