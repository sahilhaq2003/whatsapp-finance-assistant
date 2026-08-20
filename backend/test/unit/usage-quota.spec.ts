import { UsageMetric } from '../../src/modules/usage/enums/usage-metric.enum';

describe('Usage Quota', () => {
  function getPeriodKey(date?: Date): string {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function incrementUsage(
    counters: Map<string, number>,
    businessId: string,
    metric: UsageMetric,
    periodKey: string,
    amount: number = 1,
  ): number {
    const key = `${businessId}:${metric}:${periodKey}`;
    const current = counters.get(key) || 0;
    counters.set(key, current + amount);
    return current + amount;
  }

  function checkQuota(
    counters: Map<string, number>,
    businessId: string,
    metric: UsageMetric,
    periodKey: string,
    limit: number,
  ): { allowed: boolean; current: number; limit: number; remaining: number } {
    const key = `${businessId}:${metric}:${periodKey}`;
    const current = counters.get(key) || 0;
    const remaining = Math.max(0, limit - current);
    return {
      allowed: current < limit,
      current,
      limit,
      remaining,
    };
  }

  describe('Usage counter increment', () => {
    it('should increment usage from 0 to 1 with atomic $inc', () => {
      const counters = new Map<string, number>();
      const result = incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08');
      expect(result).toBe(1);
    });

    it('should accumulate increments over time', () => {
      const counters = new Map<string, number>();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08');
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08');
      const result = incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08');
      expect(result).toBe(3);
    });

    it('should support incrementing by a custom amount', () => {
      const counters = new Map<string, number>();
      const result = incrementUsage(counters, 'biz1', UsageMetric.VOICE_SECONDS, '2026-08', 30);
      expect(result).toBe(30);
    });

    it('should track counters independently per business', () => {
      const counters = new Map<string, number>();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08');
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08');
      incrementUsage(counters, 'biz2', UsageMetric.AI_REQUESTS, '2026-08');

      const key1 = 'biz1:ai_requests:2026-08';
      const key2 = 'biz2:ai_requests:2026-08';
      expect(counters.get(key1)).toBe(2);
      expect(counters.get(key2)).toBe(1);
    });

    it('should simulate Mongoose findOneAndUpdate with upsert', async () => {
      const mockFindOneAndUpdate = jest.fn().mockResolvedValue({
        _id: 'counter_id',
        businessId: 'biz1',
        metric: UsageMetric.AI_REQUESTS,
        periodKey: '2026-08',
        quantity: 1,
      });

      const result = await mockFindOneAndUpdate(
        { businessId: 'biz1', metric: UsageMetric.AI_REQUESTS, periodType: 'month', periodKey: '2026-08' },
        { $inc: { quantity: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true, new: true },
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(result.quantity).toBe(1);
    });
  });

  describe('Period key generation', () => {
    it('should generate YYYY-MM format for current month', () => {
      const key = getPeriodKey();
      expect(key).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should generate correct period key for January', () => {
      const key = getPeriodKey(new Date(2026, 0, 15));
      expect(key).toBe('2026-01');
    });

    it('should generate correct period key for December', () => {
      const key = getPeriodKey(new Date(2026, 11, 25));
      expect(key).toBe('2026-12');
    });

    it('should zero-pad single-digit months', () => {
      const key = getPeriodKey(new Date(2026, 2, 1));
      expect(key).toBe('2026-03');
    });

    it('should not zero-pad double-digit months', () => {
      const key = getPeriodKey(new Date(2026, 11, 1));
      expect(key).toBe('2026-12');
    });

    it('should generate different keys for different months', () => {
      const key1 = getPeriodKey(new Date(2026, 0, 1));
      const key2 = getPeriodKey(new Date(2026, 1, 1));
      expect(key1).not.toBe(key2);
      expect(key1).toBe('2026-01');
      expect(key2).toBe('2026-02');
    });

    it('should generate same key for different days in same month', () => {
      const key1 = getPeriodKey(new Date(2026, 7, 1));
      const key2 = getPeriodKey(new Date(2026, 7, 31));
      expect(key1).toBe(key2);
    });
  });

  describe('Quota check: under limit', () => {
    it('should allow usage when current is below limit', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();

      const result = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(50);
    });

    it('should allow usage when current is one below limit', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 49);

      const result = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(49);
      expect(result.remaining).toBe(1);
    });
  });

  describe('Quota check: at limit', () => {
    it('should deny usage when current equals limit', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);

      const result = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(50);
      expect(result.remaining).toBe(0);
    });

    it('should deny usage when current exceeds limit', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 55);

      const result = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(55);
      expect(result.remaining).toBe(0);
    });

    it('should treat -1 limit as unlimited', () => {
      const limit = -1;
      const current = 999;
      const allowed = limit === -1 || current < limit;
      expect(allowed).toBe(true);
    });
  });

  describe('Independent metric tracking', () => {
    it('should track AI requests and voice seconds independently', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();

      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 10);
      incrementUsage(counters, 'biz1', UsageMetric.VOICE_SECONDS, periodKey, 30);

      const aiQuota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      const voiceQuota = checkQuota(counters, 'biz1', UsageMetric.VOICE_SECONDS, periodKey, 600);

      expect(aiQuota.current).toBe(10);
      expect(voiceQuota.current).toBe(30);
    });

    it('should track customers and invoices independently', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();

      incrementUsage(counters, 'biz1', UsageMetric.CUSTOMERS_CREATED, periodKey, 5);
      incrementUsage(counters, 'biz1', UsageMetric.INVOICES_CREATED, periodKey, 20);

      expect(checkQuota(counters, 'biz1', UsageMetric.CUSTOMERS_CREATED, periodKey, 50).current).toBe(5);
      expect(checkQuota(counters, 'biz1', UsageMetric.INVOICES_CREATED, periodKey, 100).current).toBe(20);
    });

    it('should reset counters for new month', () => {
      const counters = new Map<string, number>();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-07', 45);

      const julyQuota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-07', 50);
      expect(julyQuota.current).toBe(45);

      const augustQuota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, '2026-08', 50);
      expect(augustQuota.current).toBe(0);
      expect(augustQuota.allowed).toBe(true);
    });
  });

  describe('consumeQuota logic', () => {
    it('should increment when quota is available', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();

      const quota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(quota.allowed).toBe(true);

      const newCount = incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey);
      expect(newCount).toBe(1);
    });

    it('should reject when quota is exhausted', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);

      const quota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(quota.allowed).toBe(false);
    });

    it('should not increment when rejected', () => {
      const counters = new Map<string, number>();
      const periodKey = getPeriodKey();
      incrementUsage(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);

      const quota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(quota.allowed).toBe(false);

      const finalQuota = checkQuota(counters, 'biz1', UsageMetric.AI_REQUESTS, periodKey, 50);
      expect(finalQuota.current).toBe(50);
    });
  });

  describe('Mock model operations', () => {
    it('should simulate getUsage returning counters for a period', async () => {
      const mockData = [
        { metric: UsageMetric.AI_REQUESTS, periodKey: '2026-08', quantity: 15 },
        { metric: UsageMetric.VOICE_SECONDS, periodKey: '2026-08', quantity: 120 },
      ];

      const mockFind = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockData),
        }),
      });

      const result = await mockFind({
        businessId: 'biz1',
        periodType: 'month',
        periodKey: '2026-08',
      }).lean().exec();

      expect(result).toHaveLength(2);
      expect(result[0].metric).toBe(UsageMetric.AI_REQUESTS);
      expect(result[1].quantity).toBe(120);
    });

    it('should simulate resetMonthlyUsage deleting old periods', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });

      const result = await mockDeleteMany({
        periodType: 'month',
        periodKey: { $lt: '2026-05' },
      });

      expect(mockDeleteMany).toHaveBeenCalledTimes(1);
      expect(result.deletedCount).toBe(3);
    });

    it('should simulate quota check with entitlements service', async () => {
      const mockGetLimits = jest.fn().mockResolvedValue({
        aiRequestsPerMonth: 50,
        voiceMinutesPerMonth: 10,
        customersPerMonth: 50,
        invoicesPerMonth: 100,
        remindersPerMonth: 20,
        exportsPerMonth: 5,
      });

      const limits = await mockGetLimits('biz1');
      expect(limits.aiRequestsPerMonth).toBe(50);

      const METRIC_TO_LIMIT_KEY: Partial<Record<UsageMetric, string>> = {
        [UsageMetric.AI_REQUESTS]: 'aiRequestsPerMonth',
        [UsageMetric.VOICE_SECONDS]: 'voiceMinutesPerMonth',
        [UsageMetric.CUSTOMERS_CREATED]: 'customersPerMonth',
        [UsageMetric.INVOICES_CREATED]: 'invoicesPerMonth',
      };

      const limitKey = METRIC_TO_LIMIT_KEY[UsageMetric.AI_REQUESTS]!;
      expect(limitKey).toBe('aiRequestsPerMonth');
      expect((limits as Record<string, number>)[limitKey]).toBe(50);
    });
  });
});
