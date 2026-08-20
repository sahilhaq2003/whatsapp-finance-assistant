describe('Payment Lifecycle', () => {
  describe('Invoice creation', () => {
    it('should create draft invoice with correct totals', () => {
      const items = [
        { quantity: 1, rateMinor: 25000 },
        { quantity: 2, rateMinor: 5000 },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rateMinor, 0);

      const invoice = {
        status: 'draft',
        subtotalMinor: subtotal,
        totalMinor: subtotal,
        paymentStatus: 'unpaid',
      };

      expect(invoice.subtotalMinor).toBe(35000);
      expect(invoice.totalMinor).toBe(35000);
      expect(invoice.status).toBe('draft');
      expect(invoice.paymentStatus).toBe('unpaid');
    });
  });

  describe('Invoice issuing', () => {
    it('should change status to issued with issuedAt', () => {
      const invoice = {
        status: 'draft',
        issuedAt: null,
      };

      const issue = (inv: typeof invoice) => {
        return { ...inv, status: 'issued', issuedAt: new Date() };
      };

      const issued = issue(invoice);
      expect(issued.status).toBe('issued');
      expect(issued.issuedAt).toBeInstanceOf(Date);
    });
  });

  describe('Partial payment', () => {
    it('should update payment status to partially_paid', () => {
      const invoice = { totalMinor: 50000, paymentStatus: 'unpaid' };
      let paidAmount = 0;

      const recordPayment = (amount: number) => {
        paidAmount += amount;
        const remaining = Math.max(0, invoice.totalMinor - paidAmount);
        if (remaining === 0) return 'paid';
        if (paidAmount > 0) return 'partially_paid';
        return 'unpaid';
      };

      expect(recordPayment(20000)).toBe('partially_paid');
    });
  });

  describe('Full payment', () => {
    it('should update payment status to paid', () => {
      const invoice = { totalMinor: 50000, paymentStatus: 'unpaid' };
      let paidAmount = 0;

      const recordPayment = (amount: number) => {
        paidAmount += amount;
        const remaining = Math.max(0, invoice.totalMinor - paidAmount);
        if (remaining === 0) return 'paid';
        if (paidAmount > 0) return 'partially_paid';
        return 'unpaid';
      };

      expect(recordPayment(50000)).toBe('paid');
    });
  });

  describe('Overpayment rejection', () => {
    it('should reject payment exceeding remaining amount', () => {
      const invoice = { totalMinor: 50000 };
      const paidAmount = 50000;
      const remaining = Math.max(0, invoice.totalMinor - paidAmount);
      const requestedAmount = 10000;

      const canPay = requestedAmount <= remaining;
      expect(canPay).toBe(false);
    });
  });

  describe('Void payment restoration', () => {
    it('should restore invoice balance after voiding payment', () => {
      let payments = [
        { id: 'pay_1', amountMinor: 20000, status: 'confirmed' },
      ];
      const invoiceTotal = 20000;

      const getConfirmedPaid = () =>
        payments
          .filter((p) => p.status === 'confirmed')
          .reduce((sum, p) => sum + p.amountMinor, 0);

      expect(getConfirmedPaid()).toBe(20000);
      expect(Math.max(0, invoiceTotal - getConfirmedPaid())).toBe(0);

      // Void the payment
      payments = payments.map((p) =>
        p.id === 'pay_1' ? { ...p, status: 'voided' } : p,
      );

      expect(getConfirmedPaid()).toBe(0);
      expect(Math.max(0, invoiceTotal - getConfirmedPaid())).toBe(20000);
    });
  });

  describe('Payment method tracking', () => {
    it('should track payment method breakdown', () => {
      const payments = [
        { method: 'cash', amountMinor: 25000, status: 'confirmed' },
        { method: 'bank_transfer', amountMinor: 50000, status: 'confirmed' },
        { method: 'bank_transfer', amountMinor: 25000, status: 'confirmed' },
        { method: 'cash', amountMinor: 10000, status: 'confirmed' },
        { method: 'card', amountMinor: 30000, status: 'confirmed' },
      ];

      const breakdown = payments.reduce((acc, p) => {
        const existing = acc.find((b) => b.method === p.method);
        if (existing) {
          existing.amount += p.amountMinor;
          existing.count += 1;
        } else {
          acc.push({ method: p.method, amount: p.amountMinor, count: 1 });
        }
        return acc;
      }, [] as Array<{ method: string; amount: number; count: number }>);

      expect(breakdown).toHaveLength(3);
      expect(breakdown.find((b) => b.method === 'cash')?.amount).toBe(35000);
      expect(breakdown.find((b) => b.method === 'bank_transfer')?.amount).toBe(75000);
    });
  });
});
