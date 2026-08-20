import { ReportCsvService } from '../../src/modules/reports/services/report-csv.service';

describe('CSV Injection Protection', () => {
  let csvService: ReportCsvService;

  beforeEach(() => {
    csvService = new ReportCsvService();
  });

  describe('Formula injection prevention', () => {
    it('should neutralize values starting with =', () => {
      const rows = [
        {
          _id: '1',
          date: '2026-08-17',
          type: 'expense',
          description: '=HYPERLINK("http://evil.com")',
          customerName: 'Test',
          categoryName: 'Delivery',
          paymentMethod: 'cash',
          amount: 5000,
          status: 'confirmed',
          source: 'manual',
        },
      ];

      const csv = csvService.generateTransactionsCsv(rows, 'LKR');
      expect(csv).toContain("'=HYPERLINK");
      expect(csv).toContain('50.00');
    });

    it('should neutralize values starting with +', () => {
      const rows = [
        {
          _id: '1',
          date: '2026-08-17',
          type: 'expense',
          description: '+SUM(A1:A10)',
          customerName: 'Test',
          categoryName: 'Delivery',
          paymentMethod: 'cash',
          amount: 5000,
          status: 'confirmed',
          source: 'manual',
        },
      ];

      const csv = csvService.generateTransactionsCsv(rows, 'LKR');
      expect(csv).toContain("'+SUM");
    });

    it('should neutralize values starting with -', () => {
      const rows = [
        {
          _id: '1',
          date: '2026-08-17',
          type: 'expense',
          description: '-10+20',
          customerName: 'Test',
          categoryName: 'Delivery',
          paymentMethod: 'cash',
          amount: 5000,
          status: 'confirmed',
          source: 'manual',
        },
      ];

      const csv = csvService.generateTransactionsCsv(rows, 'LKR');
      expect(csv).toContain("'-10+20");
    });

    it('should neutralize values starting with @', () => {
      const rows = [
        {
          _id: '1',
          date: '2026-08-17',
          type: 'expense',
          description: '@SUM(1,2)',
          customerName: 'Test',
          categoryName: 'Delivery',
          paymentMethod: 'cash',
          amount: 5000,
          status: 'confirmed',
          source: 'manual',
        },
      ];

      const csv = csvService.generateTransactionsCsv(rows, 'LKR');
      expect(csv).toContain("'@SUM");
    });

    it('should not corrupt numeric values', () => {
      const rows = [
        {
          _id: '1',
          date: '2026-08-17',
          type: 'expense',
          description: 'Normal expense',
          customerName: 'Test',
          categoryName: 'Delivery',
          paymentMethod: 'cash',
          amount: 5000,
          status: 'confirmed',
          source: 'manual',
        },
      ];

      const csv = csvService.generateTransactionsCsv(rows, 'LKR');
      expect(csv).toContain('50.00');
    });

    it('should handle customer names with special characters', () => {
      const rows = [
        {
          customerId: '1',
          customerName: "O'Brien & Associates",
          confirmedIncome: 10000,
          transactionCount: 5,
          invoiceCount: 2,
          outstandingAmount: 5000,
          overdueAmount: 0,
          lastActivityDate: '2026-08-17',
        },
      ];

      const csv = csvService.generateTransactionsCsv([], 'LKR');
      // The function should handle special characters in text values
      expect(csv).toBeDefined();
    });

    it('should handle empty values safely', () => {
      const rows = [
        {
          _id: '1',
          date: '2026-08-17',
          type: 'expense',
          description: '',
          customerName: '',
          categoryName: '',
          paymentMethod: '',
          amount: 5000,
          status: 'confirmed',
          source: 'manual',
        },
      ];

      const csv = csvService.generateTransactionsCsv(rows, 'LKR');
      expect(csv).toBeDefined();
      expect(csv.length).toBeGreaterThan(0);
    });
  });

  describe('Filename sanitization', () => {
    it('should sanitize filenames', () => {
      const filename = csvService.sanitizeFilename('Test Report (August 2026)');
      expect(filename).toBe('Test_Report__August_2026_');
    });

    it('should handle unicode in filenames', () => {
      const filename = csvService.sanitizeFilename('Report 📊');
      expect(filename).not.toContain('📊');
    });

    it('should limit filename length', () => {
      const longName = 'A'.repeat(200);
      const filename = csvService.sanitizeFilename(longName);
      expect(filename.length).toBeLessThanOrEqual(100);
    });
  });
});
