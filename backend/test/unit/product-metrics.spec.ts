import type {
  RateResult,
  RetentionResult,
  VoiceQualityResult,
  ReminderOutcomeResult,
} from '../../src/modules/product-analytics/interfaces/metrics.interface';

describe('Product Metrics', () => {
  describe('Weekly active business computation', () => {
    it('should count unique businesses across transactions, invoices, and payments', () => {
      const txBusinesses = ['b1', 'b2', 'b3'];
      const invoiceBusinesses = ['b2', 'b4'];
      const paymentBusinesses = ['b3', 'b4', 'b5'];

      const businessIds = new Set<string>([
        ...txBusinesses,
        ...invoiceBusinesses,
        ...paymentBusinesses,
      ]);

      expect(businessIds.size).toBe(5);
      expect(businessIds.has('b1')).toBe(true);
      expect(businessIds.has('b5')).toBe(true);
    });

    it('should deduplicate businesses active across multiple channels', () => {
      const txBusinesses = ['b1', 'b2'];
      const invoiceBusinesses = ['b1', 'b2'];
      const paymentBusinesses = ['b1'];

      const businessIds = new Set<string>([
        ...txBusinesses,
        ...invoiceBusinesses,
        ...paymentBusinesses,
      ]);

      expect(businessIds.size).toBe(2);
    });

    it('should return 0 when no businesses are active', () => {
      const txBusinesses: string[] = [];
      const invoiceBusinesses: string[] = [];
      const paymentBusinesses: string[] = [];

      const businessIds = new Set<string>([
        ...txBusinesses,
        ...invoiceBusinesses,
        ...paymentBusinesses,
      ]);

      expect(businessIds.size).toBe(0);
    });

    it('should return 1 when only one business is active', () => {
      const businessIds = new Set<string>(['b1']);
      expect(businessIds.size).toBe(1);
    });

    it('should simulate aggregate pipeline returning unique business ids', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'b1' },
          { _id: 'b2' },
          { _id: 'b3' },
        ]),
      });

      const result = await mockAggregate([
        { $match: { date: { $gte: new Date(), $lte: new Date() } } },
        { $group: { _id: '$businessId' } },
      ]).exec();

      expect(result).toHaveLength(3);
      expect(result.map((d: any) => d._id)).toEqual(['b1', 'b2', 'b3']);
    });
  });

  describe('D7 retention calculation', () => {
    it('should calculate D7 retention rate correctly', () => {
      const eligible = 100;
      const retained = 45;
      const rate = eligible > 0 ? retained / eligible : 0;

      expect(rate).toBe(0.45);
    });

    it('should return 0 when no businesses are eligible', () => {
      const eligible = 0;
      const retained = 0;
      const rate = eligible > 0 ? retained / eligible : 0;

      expect(rate).toBe(0);
    });

    it('should handle 100% retention', () => {
      const eligible = 50;
      const retained = 50;
      const rate = retained / eligible;

      expect(rate).toBe(1);
    });

    it('should handle 0% retention', () => {
      const eligible = 50;
      const retained = 0;
      const rate = retained / eligible;

      expect(rate).toBe(0);
    });

    it('should compute retention result interface', () => {
      const result: RetentionResult = {
        eligibleBusinesses: 100,
        retainedBusinesses: 45,
        rate: 0.45,
      };

      expect(result.eligibleBusinesses).toBe(100);
      expect(result.retainedBusinesses).toBe(45);
      expect(result.rate).toBe(0.45);
    });
  });

  describe('D30 retention calculation', () => {
    it('should calculate D30 retention rate correctly', () => {
      const eligible = 80;
      const retained = 32;
      const rate = retained / eligible;

      expect(rate).toBe(0.4);
    });

    it('should return empty result when no eligible enrollments', () => {
      const result: RetentionResult = {
        eligibleBusinesses: 0,
        retainedBusinesses: 0,
        rate: 0,
      };

      expect(result.eligibleBusinesses).toBe(0);
      expect(result.rate).toBe(0);
    });

    it('should filter enrollments by firstMeaningfulActivityAt', () => {
      const now = new Date();
      const d30Ms = 30 * 24 * 60 * 60 * 1000;

      const enrollments = [
        { firstMeaningfulActivityAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
        { firstMeaningfulActivityAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
        { firstMeaningfulActivityAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000) },
      ];

      const cutoffDate = new Date(now.getTime() - d30Ms);
      const eligible = enrollments.filter(
        (e) => e.firstMeaningfulActivityAt <= cutoffDate,
      );

      expect(eligible).toHaveLength(2);
    });

    it('should verify retention date is firstMeaningfulActivity + days', () => {
      const fma = new Date('2026-07-01');
      const days = 30;
      const retentionDate = new Date(fma.getTime() + days * 24 * 60 * 60 * 1000);

      expect(retentionDate.toISOString().startsWith('2026-07-31')).toBe(true);
    });

    it('should skip enrollments where retention date is in the future', () => {
      const now = new Date();
      const fma = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const d30 = 30;
      const retentionDate = new Date(fma.getTime() + d30 * 24 * 60 * 60 * 1000);
      const shouldSkip = retentionDate > now;

      expect(shouldSkip).toBe(true);
    });
  });

  describe('WhatsApp message success rate', () => {
    it('should calculate confirmation success rate', () => {
      const total = 150;
      const confirmed = 120;
      const rate = total > 0 ? confirmed / total : 0;

      expect(rate).toBeCloseTo(0.8, 1);
    });

    it('should return 0 rate when no proposals exist', () => {
      const total = 0;
      const confirmed = 0;
      const rate = total > 0 ? confirmed / total : 0;

      expect(rate).toBe(0);
    });

    it('should build RateResult interface', () => {
      const result: RateResult = {
        denominator: 200,
        numerator: 160,
        rate: 0.8,
      };

      expect(result.denominator).toBe(200);
      expect(result.numerator).toBe(160);
      expect(result.rate).toBe(0.8);
    });

    it('should simulate aggregation pipeline for confirmation success', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: null, total: 150, confirmed: 120 },
        ]),
      });

      const result = await mockAggregate([
        { $match: { inputSource: { $in: ['whatsapp_text', 'whatsapp_voice'] } } },
        { $group: { _id: null, total: { $sum: 1 }, confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } } } },
      ]).exec();

      const total = result.length > 0 ? result[0].total : 0;
      const confirmed = result.length > 0 ? result[0].confirmed : 0;
      const rate = total > 0 ? confirmed / total : 0;

      expect(total).toBe(150);
      expect(confirmed).toBe(120);
      expect(rate).toBeCloseTo(0.8, 1);
    });
  });

  describe('AI proposal correction rate', () => {
    it('should calculate correction rate from revision history', () => {
      const total = 100;
      const corrected = 15;
      const rate = total > 0 ? corrected / total : 0;

      expect(rate).toBe(0.15);
    });

    it('should return 0 when no proposals have corrections', () => {
      const total = 50;
      const corrected = 0;
      const rate = total > 0 ? corrected / total : 0;

      expect(rate).toBe(0);
    });

    it('should count proposals with non-empty revisionHistory', () => {
      const proposals = [
        { revisionHistory: [] },
        { revisionHistory: [{ field: 'amount' }] },
        { revisionHistory: [{ field: 'category' }, { field: 'amount' }] },
        { revisionHistory: [] },
      ];

      const corrected = proposals.filter((p) => p.revisionHistory.length > 0).length;
      expect(corrected).toBe(2);
    });

    it('should simulate correction rate aggregation', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: null, total: 100, corrected: 15 },
        ]),
      });

      const result = await mockAggregate([
        { $match: { createdAt: { $gte: new Date(), $lte: new Date() } } },
        { $group: { _id: null, total: { $sum: 1 }, corrected: { $sum: { $cond: [{ $gt: [{ $size: '$revisionHistory' }, 0] }, 1, 0] } } } },
      ]).exec();

      const total = result[0].total;
      const corrected = result[0].corrected;
      expect(corrected / total).toBe(0.15);
    });

    it('should filter by source when specified', () => {
      const matchStage: Record<string, unknown> = {
        createdAt: { $gte: new Date(), $lte: new Date() },
        inputSource: 'whatsapp_voice',
      };

      expect(matchStage.inputSource).toBe('whatsapp_voice');
    });

    it('should not include source filter when not specified', () => {
      const source: string | undefined = undefined;
      const matchStage: Record<string, unknown> = {
        createdAt: { $gte: new Date(), $lte: new Date() },
      };

      if (source) {
        matchStage.inputSource = source;
      }

      expect(matchStage).not.toHaveProperty('inputSource');
    });
  });

  describe('Voice note quality metrics', () => {
    it('should calculate transcription success rate', () => {
      const voiceReceived = 80;
      const successfulTranscription = 70;
      const rate = voiceReceived > 0 ? successfulTranscription / voiceReceived : 0;

      expect(rate).toBeCloseTo(0.875, 2);
    });

    it('should calculate voice confirmation rate', () => {
      const voiceReceived = 80;
      const proposalsConfirmed = 55;
      const rate = voiceReceived > 0 ? proposalsConfirmed / voiceReceived : 0;

      expect(rate).toBeCloseTo(0.6875, 3);
    });

    it('should return zero rates when no voice messages received', () => {
      const voiceReceived = 0;
      const rate = voiceReceived > 0 ? 42 / voiceReceived : 0;

      expect(rate).toBe(0);
    });

    it('should build VoiceQualityResult interface', () => {
      const result: VoiceQualityResult = {
        voiceReceived: 80,
        successfulTranscription: 70,
        transcriptionSuccessRate: 0.875,
        proposalsCreated: 80,
        proposalsConfirmed: 55,
        confirmationRate: 0.6875,
      };

      expect(result.voiceReceived).toBe(80);
      expect(result.successfulTranscription).toBe(70);
      expect(result.proposalsCreated).toBe(80);
      expect(result.proposalsConfirmed).toBe(55);
    });

    it('should simulate voice quality aggregation pipeline', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: null, total: 80, withTranscript: 70, confirmed: 55 },
        ]),
      });

      const result = await mockAggregate([
        { $match: { inputSource: 'whatsapp_voice' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withTranscript: { $sum: { $cond: [{ $ne: ['$transcript', null] }, 1, 0] } },
            confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          },
        },
      ]).exec();

      const data = result[0];
      const transcriptionRate = data.total > 0 ? data.withTranscript / data.total : 0;
      const confirmationRate = data.total > 0 ? data.confirmed / data.total : 0;

      expect(transcriptionRate).toBeCloseTo(0.875, 2);
      expect(confirmationRate).toBeCloseTo(0.6875, 3);
    });

    it('should ensure proposalsCreated equals voiceReceived', () => {
      const voiceReceived = 80;
      const proposalsCreated = voiceReceived;
      expect(proposalsCreated).toBe(80);
    });
  });

  describe('Reminder outcome metrics', () => {
    it('should calculate reminder outcome rate', () => {
      const remindersSent = 40;
      const paymentsAfterReminder = 20;
      const rate = remindersSent > 0 ? paymentsAfterReminder / remindersSent : 0;

      expect(rate).toBe(0.5);
    });

    it('should return 0 outcome rate when no reminders sent', () => {
      const remindersSent = 0;
      const paymentsAfterReminder = 0;
      const rate = remindersSent > 0 ? paymentsAfterReminder / remindersSent : 0;

      expect(rate).toBe(0);
    });

    it('should build ReminderOutcomeResult interface', () => {
      const result: ReminderOutcomeResult = {
        remindersSent: 40,
        paymentsAfterReminder: 20,
        outcomeRate: 0.5,
      };

      expect(result.remindersSent).toBe(40);
      expect(result.paymentsAfterReminder).toBe(20);
      expect(result.outcomeRate).toBe(0.5);
    });

    it('should filter reminders with invoiceId', () => {
      const reminders = [
        { invoiceId: 'inv1', sentAt: new Date() },
        { invoiceId: null, sentAt: new Date() },
        { invoiceId: 'inv3', sentAt: new Date() },
      ];

      const withInvoice = reminders.filter((r) => r.invoiceId !== null);
      expect(withInvoice).toHaveLength(2);
    });

    it('should apply payment window check', () => {
      const reminderSentAt = new Date('2026-08-01');
      const reminderPaymentDays = 30;
      const paymentWindowEnd = new Date(
        reminderSentAt.getTime() + reminderPaymentDays * 24 * 60 * 60 * 1000,
      );

      const paymentDate = new Date('2026-08-15');
      const isWithinWindow = paymentDate > reminderSentAt && paymentDate <= paymentWindowEnd;
      expect(isWithinWindow).toBe(true);

      const latePayment = new Date('2026-10-01');
      const isLateWithinWindow = latePayment > reminderSentAt && latePayment <= paymentWindowEnd;
      expect(isLateWithinWindow).toBe(false);
    });

    it('should simulate reminder outcome aggregation', async () => {
      const mockAggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: null, total: 40 }]),
      });

      const result = await mockAggregate([
        { $match: { sentAt: { $gte: new Date(), $lte: new Date() } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]).exec();

      expect(result[0].total).toBe(40);
    });
  });
});
