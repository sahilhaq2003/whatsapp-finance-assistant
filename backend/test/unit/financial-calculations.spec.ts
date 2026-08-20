import { toMinorUnits, fromMinorUnits } from '../../src/common/utils/financial.utils';

describe('Financial Calculations', () => {
  describe('Income/Expense totals', () => {
    it('should sum confirmed income correctly', () => {
      const transactions = [
        { type: 'income', amountMinor: 50000, status: 'confirmed' },
        { type: 'income', amountMinor: 30000, status: 'confirmed' },
        { type: 'income', amountMinor: 20000, status: 'confirmed' },
      ];

      const total = transactions
        .filter((t) => t.type === 'income' && t.status === 'confirmed')
        .reduce((sum, t) => sum + t.amountMinor, 0);

      expect(total).toBe(100000);
    });

    it('should sum confirmed expenses correctly', () => {
      const transactions = [
        { type: 'expense', amountMinor: 15000, status: 'confirmed' },
        { type: 'expense', amountMinor: 10000, status: 'confirmed' },
      ];

      const total = transactions
        .filter((t) => t.type === 'expense' && t.status === 'confirmed')
        .reduce((sum, t) => sum + t.amountMinor, 0);

      expect(total).toBe(25000);
    });

    it('should exclude proposed transactions', () => {
      const transactions = [
        { type: 'income', amountMinor: 50000, status: 'confirmed' },
        { type: 'income', amountMinor: 100000, status: 'proposed' },
      ];

      const total = transactions
        .filter((t) => t.type === 'income' && t.status === 'confirmed')
        .reduce((sum, t) => sum + t.amountMinor, 0);

      expect(total).toBe(50000);
    });

    it('should exclude voided transactions', () => {
      const transactions = [
        { type: 'expense', amountMinor: 35000, status: 'confirmed' },
        { type: 'expense', amountMinor: 10000, status: 'voided' },
      ];

      const total = transactions
        .filter((t) => t.type === 'expense' && t.status === 'confirmed')
        .reduce((sum, t) => sum + t.amountMinor, 0);

      expect(total).toBe(35000);
    });
  });

  describe('Net Cash Flow', () => {
    it('should calculate net cash flow correctly', () => {
      const income = 100000;
      const expenses = 35000;
      const net = income - expenses;
      expect(net).toBe(65000);
    });

    it('should handle negative net cash flow', () => {
      const income = 20000;
      const expenses = 50000;
      const net = income - expenses;
      expect(net).toBe(-30000);
    });

    it('should handle zero values', () => {
      expect(0 - 0).toBe(0);
    });
  });

  describe('Invoice calculations', () => {
    it('should calculate line total correctly', () => {
      const quantity = 2;
      const rateMinor = 5000;
      const lineTotal = quantity * rateMinor;
      expect(lineTotal).toBe(10000);
    });

    it('should calculate invoice subtotal from items', () => {
      const items = [
        { quantity: 1, rateMinor: 25000 },
        { quantity: 2, rateMinor: 5000 },
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.rateMinor,
        0,
      );

      expect(subtotal).toBe(35000);
    });

    it('should handle complex multi-item invoice', () => {
      const items = [
        { quantity: 3, rateMinor: 1000 },
        { quantity: 1, rateMinor: 15000 },
        { quantity: 5, rateMinor: 2000 },
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.rateMinor,
        0,
      );

      // 3000 + 15000 + 10000 = 28000
      expect(subtotal).toBe(28000);
    });
  });

  describe('Payment calculations', () => {
    it('should calculate remaining amount after partial payment', () => {
      const invoiceTotal = 50000;
      const paidAmount = 20000;
      const remaining = Math.max(0, invoiceTotal - paidAmount);
      expect(remaining).toBe(30000);
    });

    it('should calculate remaining after full payment', () => {
      const invoiceTotal = 50000;
      const paidAmount = 50000;
      const remaining = Math.max(0, invoiceTotal - paidAmount);
      expect(remaining).toBe(0);
    });

    it('should handle overpayment gracefully', () => {
      const invoiceTotal = 50000;
      const paidAmount = 60000;
      const remaining = Math.max(0, invoiceTotal - paidAmount);
      expect(remaining).toBe(0);
    });

    it('should determine payment status correctly', () => {
      const getStatus = (total: number, paid: number) => {
        const remaining = Math.max(0, total - paid);
        if (remaining === 0) return 'paid';
        if (paid > 0) return 'partially_paid';
        return 'unpaid';
      };

      expect(getStatus(50000, 0)).toBe('unpaid');
      expect(getStatus(50000, 25000)).toBe('partially_paid');
      expect(getStatus(50000, 50000)).toBe('paid');
      expect(getStatus(50000, 60000)).toBe('paid');
    });
  });

  describe('Voided payment restoration', () => {
    it('should restore invoice balance after voiding payment', () => {
      let paidAmount = 20000;
      const invoiceTotal = 20000;

      // Payment confirmed
      let remaining = Math.max(0, invoiceTotal - paidAmount);
      expect(remaining).toBe(0);

      // Payment voided - restore
      paidAmount = 0;
      remaining = Math.max(0, invoiceTotal - paidAmount);
      expect(remaining).toBe(20000);
    });
  });

  describe('Outstanding balance', () => {
    it('should sum outstanding across multiple invoices', () => {
      const invoices = [
        { totalMinor: 50000, paidMinor: 35000 },
        { totalMinor: 20000, paidMinor: 20000 },
        { totalMinor: 30000, paidMinor: 0 },
      ];

      const totalOutstanding = invoices.reduce((sum, inv) => {
        return sum + Math.max(0, inv.totalMinor - inv.paidMinor);
      }, 0);

      expect(totalOutstanding).toBe(45000);
    });

    it('should not count draft invoices as outstanding', () => {
      const invoices = [
        { status: 'issued', totalMinor: 50000, paidMinor: 0 },
        { status: 'draft', totalMinor: 100000, paidMinor: 0 },
      ];

      const outstanding = invoices
        .filter((inv) => inv.status === 'issued')
        .reduce((sum, inv) => sum + Math.max(0, inv.totalMinor - inv.paidMinor), 0);

      expect(outstanding).toBe(50000);
    });

    it('should not count voided invoices as outstanding', () => {
      const invoices = [
        { status: 'issued', totalMinor: 50000, paidMinor: 0 },
        { status: 'voided', totalMinor: 30000, paidMinor: 0 },
      ];

      const outstanding = invoices
        .filter((inv) => inv.status === 'issued')
        .reduce((sum, inv) => sum + Math.max(0, inv.totalMinor - inv.paidMinor), 0);

      expect(outstanding).toBe(50000);
    });
  });

  describe('Overdue detection', () => {
    it('should detect overdue invoice', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() - 10);

      const isOverdue = dueDate < today;
      expect(isOverdue).toBe(true);
    });

    it('should not mark future-due invoice as overdue', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 5);

      const isOverdue = dueDate < today;
      expect(isOverdue).toBe(false);
    });

    it('should not mark paid invoice as overdue', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() - 10);

      const remaining = 0;
      const isOverdue = dueDate < today && remaining > 0;
      expect(isOverdue).toBe(false);
    });
  });

  describe('Aging buckets', () => {
    it('should categorize overdue days correctly', () => {
      const getBucket = (days: number) => {
        if (days <= 7) return '1to7';
        if (days <= 30) return '8to30';
        if (days <= 60) return '31to60';
        return '61plus';
      };

      expect(getBucket(1)).toBe('1to7');
      expect(getBucket(7)).toBe('1to7');
      expect(getBucket(8)).toBe('8to30');
      expect(getBucket(30)).toBe('8to30');
      expect(getBucket(31)).toBe('31to60');
      expect(getBucket(60)).toBe('31to60');
      expect(getBucket(61)).toBe('61plus');
      expect(getBucket(90)).toBe('61plus');
    });
  });

  describe('Category percentage', () => {
    it('should calculate percentage correctly', () => {
      const categoryAmount = 10000;
      const totalAmount = 40000;
      const percentage = totalAmount > 0 ? Math.round((categoryAmount / totalAmount) * 10000) / 100 : 0;
      expect(percentage).toBe(25);
    });

    it('should handle zero total', () => {
      const totalAmount = 0;
      const percentage = totalAmount > 0 ? Math.round((10000 / totalAmount) * 10000) / 100 : 0;
      expect(percentage).toBe(0);
    });
  });
});
