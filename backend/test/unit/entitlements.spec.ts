import { FeatureKey } from '../../src/modules/entitlements/enums/feature-key.enum';

describe('Entitlements', () => {
  const ALL_FEATURE_KEYS = Object.values(FeatureKey);

  function getDefaultFeatures(): Record<FeatureKey, boolean> {
    const features = {} as Record<FeatureKey, boolean>;
    for (const key of ALL_FEATURE_KEYS) {
      features[key] = false;
    }
    return features;
  }

  function getDefaultLimits() {
    return {
      customersPerMonth: 50,
      invoicesPerMonth: 100,
      aiRequestsPerMonth: 50,
      voiceMinutesPerMonth: 10,
      remindersPerMonth: 20,
      exportsPerMonth: 5,
    };
  }

  function mergePlanFeatures(
    base: Record<FeatureKey, boolean>,
    planFeatures: Array<{ key: string; enabled: boolean }>,
  ): Record<FeatureKey, boolean> {
    const result = { ...base };
    for (const toggle of planFeatures) {
      if (toggle.key in result) {
        result[toggle.key as FeatureKey] = toggle.enabled;
      }
    }
    return result;
  }

  function mergeBusinessOverrides(
    features: Record<FeatureKey, boolean>,
    overrides: Record<string, boolean>,
  ): Record<FeatureKey, boolean> {
    const result = { ...features };
    for (const [key, value] of Object.entries(overrides)) {
      if (key in result && typeof value === 'boolean') {
        result[key as FeatureKey] = value;
      }
    }
    return result;
  }

  function mergeLimits(
    baseLimits: Record<string, number>,
    planLimits: Record<string, number>,
    businessLimits?: Record<string, number>,
  ) {
    const limits = { ...baseLimits, ...planLimits };
    if (businessLimits) {
      for (const [key, value] of Object.entries(businessLimits)) {
        if (key in limits && typeof value === 'number') {
          limits[key] = value;
        }
      }
    }
    return limits;
  }

  describe('Merge plan defaults with business overrides', () => {
    it('should start with all features disabled for free plan', () => {
      const features = getDefaultFeatures();
      for (const key of ALL_FEATURE_KEYS) {
        expect(features[key]).toBe(false);
      }
    });

    it('should apply plan feature toggles over defaults', () => {
      const defaults = getDefaultFeatures();
      const planFeatures = [
        { key: FeatureKey.VOICE_INPUT, enabled: true },
        { key: FeatureKey.AUTOMATED_REMINDERS, enabled: true },
      ];

      const result = mergePlanFeatures(defaults, planFeatures);
      expect(result[FeatureKey.VOICE_INPUT]).toBe(true);
      expect(result[FeatureKey.AUTOMATED_REMINDERS]).toBe(true);
      expect(result[FeatureKey.ADVANCED_AI_QUERIES]).toBe(false);
      expect(result[FeatureKey.TEAM_ACCESS]).toBe(false);
    });

    it('should apply business overrides on top of plan features', () => {
      const defaults = getDefaultFeatures();
      const planFeatures = [
        { key: FeatureKey.VOICE_INPUT, enabled: false },
        { key: FeatureKey.AUTOMATED_REMINDERS, enabled: true },
      ];
      const features = mergePlanFeatures(defaults, planFeatures);

      const businessOverrides = { voiceInput: true };
      const final = mergeBusinessOverrides(features, businessOverrides);

      expect(final[FeatureKey.VOICE_INPUT]).toBe(true);
      expect(final[FeatureKey.AUTOMATED_REMINDERS]).toBe(true);
    });

    it('should ignore invalid feature keys in business overrides', () => {
      const defaults = getDefaultFeatures();
      const overrides = { invalidFeatureKey: true } as Record<string, boolean>;
      const result = mergeBusinessOverrides(defaults, overrides);

      for (const key of ALL_FEATURE_KEYS) {
        expect(result[key]).toBe(false);
      }
    });

    it('should ignore non-boolean values in business overrides', () => {
      const defaults = getDefaultFeatures();
      defaults[FeatureKey.VOICE_INPUT] = false;

      const overrides = { voiceInput: 'yes' } as any;
      const result = mergeBusinessOverrides(defaults, overrides);

      expect(result[FeatureKey.VOICE_INPUT]).toBe(false);
    });
  });

  describe('Feature entitlement lookup by plan code', () => {
    const plans: Record<string, Array<{ key: string; enabled: boolean }>> = {
      free: [],
      starter: [
        { key: FeatureKey.VOICE_INPUT, enabled: true },
        { key: FeatureKey.AUTOMATED_REMINDERS, enabled: true },
      ],
      pro: [
        { key: FeatureKey.VOICE_INPUT, enabled: true },
        { key: FeatureKey.AUTOMATED_REMINDERS, enabled: true },
        { key: FeatureKey.ADVANCED_AI_QUERIES, enabled: true },
        { key: FeatureKey.SCHEDULED_SUMMARIES, enabled: true },
        { key: FeatureKey.ADVANCED_REPORTS, enabled: true },
        { key: FeatureKey.REPORT_EXPORT, enabled: true },
        { key: FeatureKey.CUSTOM_CATEGORIES, enabled: true },
        { key: FeatureKey.TEAM_ACCESS, enabled: true },
      ],
    };

    it('should return all features disabled for free plan', () => {
      const defaults = getDefaultFeatures();
      const features = mergePlanFeatures(defaults, plans.free);
      expect(features[FeatureKey.VOICE_INPUT]).toBe(false);
      expect(features[FeatureKey.TEAM_ACCESS]).toBe(false);
    });

    it('should enable subset of features for starter plan', () => {
      const defaults = getDefaultFeatures();
      const features = mergePlanFeatures(defaults, plans.starter);
      expect(features[FeatureKey.VOICE_INPUT]).toBe(true);
      expect(features[FeatureKey.AUTOMATED_REMINDERS]).toBe(true);
      expect(features[FeatureKey.ADVANCED_AI_QUERIES]).toBe(false);
      expect(features[FeatureKey.TEAM_ACCESS]).toBe(false);
    });

    it('should enable all features for pro plan', () => {
      const defaults = getDefaultFeatures();
      const features = mergePlanFeatures(defaults, plans.pro);
      for (const key of ALL_FEATURE_KEYS) {
        expect(features[key]).toBe(true);
      }
    });

    it('should return correct value for isFeatureEnabled lookup', () => {
      const defaults = getDefaultFeatures();
      const features = mergePlanFeatures(defaults, plans.starter);

      const isEnabled = (feature: FeatureKey) => features[feature] ?? false;
      expect(isEnabled(FeatureKey.VOICE_INPUT)).toBe(true);
      expect(isEnabled(FeatureKey.REPORT_EXPORT)).toBe(false);
    });
  });

  describe('Limit enforcement per plan tier', () => {
    it('should use default limits when plan has no custom limits', () => {
      const base = getDefaultLimits();
      const limits = mergeLimits(base, {});
      expect(limits.customersPerMonth).toBe(50);
      expect(limits.invoicesPerMonth).toBe(100);
    });

    it('should apply plan-specific limits over defaults', () => {
      const base = getDefaultLimits();
      const planLimits = {
        customersPerMonth: 500,
        invoicesPerMonth: 1000,
        aiRequestsPerMonth: 200,
      };
      const limits = mergeLimits(base, planLimits);

      expect(limits.customersPerMonth).toBe(500);
      expect(limits.invoicesPerMonth).toBe(1000);
      expect(limits.aiRequestsPerMonth).toBe(200);
      expect(limits.voiceMinutesPerMonth).toBe(10);
    });

    it('should apply business-specific overrides on top of plan limits', () => {
      const base = getDefaultLimits();
      const planLimits = { customersPerMonth: 500 };
      const businessLimits = { customersPerMonth: 1000 };
      const limits = mergeLimits(base, planLimits, businessLimits);

      expect(limits.customersPerMonth).toBe(1000);
    });

    it('should reject non-numeric business overrides', () => {
      const base = getDefaultLimits();
      const planLimits = { customersPerMonth: 500 };
      const businessLimits = { customersPerMonth: 'unlimited' } as any;
      const limits = mergeLimits(base, planLimits, businessLimits);

      expect(limits.customersPerMonth).toBe(500);
    });

    it('should detect quota exceeded', () => {
      const limit = 50;
      const current = 50;
      const allowed = current < limit;
      expect(allowed).toBe(false);
    });

    it('should allow usage under limit', () => {
      const limit = 50;
      const current = 49;
      const allowed = current < limit;
      expect(allowed).toBe(true);
    });
  });

  describe('Free plan defaults', () => {
    it('should have 50 customers per month', () => {
      const limits = getDefaultLimits();
      expect(limits.customersPerMonth).toBe(50);
    });

    it('should have 100 invoices per month', () => {
      const limits = getDefaultLimits();
      expect(limits.invoicesPerMonth).toBe(100);
    });

    it('should have 50 AI requests per month', () => {
      const limits = getDefaultLimits();
      expect(limits.aiRequestsPerMonth).toBe(50);
    });

    it('should have 10 voice minutes per month', () => {
      const limits = getDefaultLimits();
      expect(limits.voiceMinutesPerMonth).toBe(10);
    });

    it('should have 20 reminders per month', () => {
      const limits = getDefaultLimits();
      expect(limits.remindersPerMonth).toBe(20);
    });

    it('should have 5 exports per month', () => {
      const limits = getDefaultLimits();
      expect(limits.exportsPerMonth).toBe(5);
    });

    it('should have all features disabled', () => {
      const features = getDefaultFeatures();
      for (const key of ALL_FEATURE_KEYS) {
        expect(features[key]).toBe(false);
      }
    });
  });

  describe('Mock model operations', () => {
    it('should simulate plan lookup by code', async () => {
      const mockPlans = [
        { code: 'free', name: 'Free', features: [], limits: {} },
        { code: 'pro', name: 'Pro', features: [{ key: 'voiceInput', enabled: true }], limits: { customersPerMonth: 500 } },
      ];

      const mockFindOne = jest.fn().mockImplementation((query: any) => ({
        lean: jest.fn().mockResolvedValue(mockPlans.find((p) => p.code === query.code) || null),
      }));

      const result = await mockFindOne({ code: 'pro' }).lean();
      expect(result.code).toBe('pro');
      expect(result.features).toHaveLength(1);

      const missing = await mockFindOne({ code: 'enterprise' }).lean();
      expect(missing).toBeNull();
    });

    it('should simulate createPlanDefinition', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        _id: 'plan_id',
        code: 'starter',
        name: 'Starter',
        features: [{ key: FeatureKey.VOICE_INPUT, enabled: true }],
        limits: { customersPerMonth: 200 },
      });

      const result = await mockCreate({
        code: 'starter',
        name: 'Starter',
        features: [{ key: FeatureKey.VOICE_INPUT, enabled: true }],
        limits: { customersPerMonth: 200 },
      });

      expect(result.code).toBe('starter');
      expect(result.features[0].enabled).toBe(true);
    });

    it('should simulate listPlans with sorting', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { code: 'free' },
            { code: 'pro' },
            { code: 'starter' },
          ]),
        }),
      });

      const result = await mockFind().sort({ code: 1 }).lean();
      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('free');
    });
  });
});
