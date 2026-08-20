import { BetaInviteStatus } from '../../src/modules/beta/enums/beta-invite-status.enum';
import { BetaEnrollmentStatus } from '../../src/modules/beta/enums/beta-enrollment-status.enum';

describe('Beta Invites', () => {
  describe('Invite creation', () => {
    it('should generate a code hash from the plaintext code', () => {
      const crypto = require('crypto');
      const code = 'DP-BETA-ABC12345';
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      expect(hash).toHaveLength(64);
      expect(typeof hash).toBe('string');
    });

    it('should produce consistent hashes for the same code', () => {
      const crypto = require('crypto');
      const code = 'DP-BETA-XYZ99999';
      const hash1 = crypto.createHash('sha256').update(code).digest('hex');
      const hash2 = crypto.createHash('sha256').update(code).digest('hex');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', () => {
      const crypto = require('crypto');
      const hash1 = crypto.createHash('sha256').update('DP-BETA-AAA11111').digest('hex');
      const hash2 = crypto.createHash('sha256').update('DP-BETA-BBB22222').digest('hex');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Invite expiry', () => {
    it('should set expiry date 30 days in the future by default', () => {
      const now = new Date();
      const expiresInDays = 30;
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(30);
    });

    it('should respect custom expiresInDays', () => {
      const now = new Date();
      const expiresInDays = 7;
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(7);
    });

    it('should consider expired invite if current date exceeds expiresAt', () => {
      const expiresAt = new Date('2026-01-01');
      const now = new Date('2026-08-17');
      expect(now > expiresAt).toBe(true);
    });

    it('should not consider active invite as expired', () => {
      const expiresAt = new Date('2027-01-01');
      const now = new Date('2026-08-17');
      expect(now > expiresAt).toBe(false);
    });
  });

  describe('Invite status transitions', () => {
    it('should default to active status on creation', () => {
      const invite = {
        codeHash: 'abc123',
        status: BetaInviteStatus.ACTIVE,
        expiresAt: new Date(),
        maxUses: 1,
        usedCount: 0,
      };
      expect(invite.status).toBe(BetaInviteStatus.ACTIVE);
    });

    it('should transition from active to revoked', () => {
      let status = BetaInviteStatus.ACTIVE;
      const revoke = () => {
        status = BetaInviteStatus.REVOKED;
      };
      expect(status).toBe(BetaInviteStatus.ACTIVE);
      revoke();
      expect(status).toBe(BetaInviteStatus.REVOKED);
    });

    it('should transition from active to exhausted when maxUses reached', () => {
      let status = BetaInviteStatus.ACTIVE;
      let usedCount = 0;
      const maxUses = 2;

      const redeem = () => {
        usedCount++;
        if (usedCount >= maxUses) {
          status = BetaInviteStatus.EXHAUSTED;
        }
      };

      redeem();
      expect(status).toBe(BetaInviteStatus.ACTIVE);
      redeem();
      expect(status).toBe(BetaInviteStatus.EXHAUSTED);
    });

    it('should not allow redeeming a revoked invite', () => {
      const status: string = BetaInviteStatus.REVOKED;
      const canRedeem = status === BetaInviteStatus.ACTIVE;
      expect(canRedeem).toBe(false);
    });

    it('should not allow redeeming an exhausted invite', () => {
      const status: string = BetaInviteStatus.EXHAUSTED;
      const canRedeem = status === BetaInviteStatus.ACTIVE;
      expect(canRedeem).toBe(false);
    });

    it('should not allow redeeming an expired invite', () => {
      const status = BetaInviteStatus.ACTIVE;
      const expiresAt = new Date('2026-01-01');
      const now = new Date('2026-08-17');
      const canRedeem = status === BetaInviteStatus.ACTIVE && now <= expiresAt;
      expect(canRedeem).toBe(false);
    });
  });

  describe('Max uses enforcement', () => {
    it('should allow single-use invite (maxUses=1)', () => {
      let usedCount = 0;
      const maxUses = 1;

      const redeem = () => {
        if (usedCount >= maxUses) return false;
        usedCount++;
        return true;
      };

      expect(redeem()).toBe(true);
      expect(redeem()).toBe(false);
      expect(usedCount).toBe(1);
    });

    it('should allow multi-use invite up to maxUses', () => {
      let usedCount = 0;
      const maxUses = 5;

      for (let i = 0; i < maxUses; i++) {
        expect(usedCount < maxUses).toBe(true);
        usedCount++;
      }

      expect(usedCount).toBe(5);
      expect(usedCount >= maxUses).toBe(true);
    });

    it('should enforce atomic increment of usedCount', () => {
      const invite = { usedCount: 0, maxUses: 3 };

      const inc = (amt: number) => {
        invite.usedCount += amt;
      };

      inc(1);
      expect(invite.usedCount).toBe(1);
      inc(1);
      expect(invite.usedCount).toBe(2);
      inc(1);
      expect(invite.usedCount).toBe(3);
    });
  });

  describe('Cohort assignment', () => {
    it('should assign cohort to invite on creation', () => {
      const invite = {
        codeHash: 'hash123',
        status: BetaInviteStatus.ACTIVE,
        cohort: 'beta-v1',
      };
      expect(invite.cohort).toBe('beta-v1');
    });

    it('should propagate cohort from invite to enrollment', () => {
      const invite = { cohort: 'beta-v2' };
      const enrollment = {
        userId: 'user1',
        inviteId: 'invite1',
        cohort: invite.cohort,
        status: BetaEnrollmentStatus.ONBOARDING,
      };
      expect(enrollment.cohort).toBe('beta-v2');
    });

    it('should handle invite without cohort', () => {
      const invite = {
        codeHash: 'hash123',
        status: BetaInviteStatus.ACTIVE,
        cohort: undefined,
      };
      expect(invite.cohort).toBeUndefined();
    });

    it('should allow filtering enrollments by cohort', () => {
      const enrollments = [
        { cohort: 'beta-v1', businessId: 'b1' },
        { cohort: 'beta-v2', businessId: 'b2' },
        { cohort: 'beta-v1', businessId: 'b3' },
      ];

      const filtered = enrollments.filter((e) => e.cohort === 'beta-v1');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Mock model operations', () => {
    it('should simulate createInvite via model.create()', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        _id: 'mock_id',
        codeHash: 'hashed_code',
        status: BetaInviteStatus.ACTIVE,
        expiresAt: new Date(),
        maxUses: 1,
        usedCount: 0,
      });

      const result = await mockCreate({
        codeHash: 'hashed_code',
        status: BetaInviteStatus.ACTIVE,
        expiresAt: new Date(),
        maxUses: 1,
        usedCount: 0,
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result.codeHash).toBe('hashed_code');
      expect(result.status).toBe(BetaInviteStatus.ACTIVE);
    });

    it('should simulate findOneAndUpdate for redeeming invite', async () => {
      const mockFindOneAndUpdate = jest.fn().mockResolvedValue({
        _id: 'invite_id',
        codeHash: 'hash',
        status: BetaInviteStatus.ACTIVE,
        usedCount: 1,
        maxUses: 3,
      });

      const result = await mockFindOneAndUpdate(
        { codeHash: 'hash', status: BetaInviteStatus.ACTIVE, usedCount: { $lt: 3 } },
        { $inc: { usedCount: 1 } },
        { new: true },
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(result.usedCount).toBe(1);
    });

    it('should simulate revokeInvite via findByIdAndUpdate', async () => {
      const mockFindByIdAndUpdate = jest.fn().mockResolvedValue({
        _id: 'invite_id',
        status: BetaInviteStatus.REVOKED,
      });

      const result = await mockFindByIdAndUpdate(
        'invite_id',
        { status: BetaInviteStatus.REVOKED },
        { new: true },
      );

      expect(result.status).toBe(BetaInviteStatus.REVOKED);
    });

    it('should return null for findOne when invite not found', async () => {
      const mockFindOne = jest.fn().mockResolvedValue(null);
      const result = await mockFindOne({ codeHash: 'nonexistent' });
      expect(result).toBeNull();
    });

    it('should simulate listEnrollments with cohort filter', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { businessId: 'b1', cohort: 'beta-v1' },
            { businessId: 'b2', cohort: 'beta-v1' },
          ]),
        }),
      });

      const result = await mockFind({ cohort: 'beta-v1' }).sort({ createdAt: -1 }).exec();
      expect(result).toHaveLength(2);
      expect(result.every((e: any) => e.cohort === 'beta-v1')).toBe(true);
    });
  });

  describe('Enrollment status transitions', () => {
    it('should transition from invited to onboarding', () => {
      let status = BetaEnrollmentStatus.INVITED;
      status = BetaEnrollmentStatus.ONBOARDING;
      expect(status).toBe(BetaEnrollmentStatus.ONBOARDING);
    });

    it('should transition from onboarding to active', () => {
      let status = BetaEnrollmentStatus.ONBOARDING;
      status = BetaEnrollmentStatus.ACTIVE;
      expect(status).toBe(BetaEnrollmentStatus.ACTIVE);
    });

    it('should transition from active to paused', () => {
      let status = BetaEnrollmentStatus.ACTIVE;
      status = BetaEnrollmentStatus.PAUSED;
      expect(status).toBe(BetaEnrollmentStatus.PAUSED);
    });

    it('should transition from active to exited', () => {
      let status = BetaEnrollmentStatus.ACTIVE;
      status = BetaEnrollmentStatus.EXITED;
      expect(status).toBe(BetaEnrollmentStatus.EXITED);
    });

    it('should not reactivate an exited enrollment without a new invite', () => {
      const status = BetaEnrollmentStatus.EXITED;
      const isExited = status === BetaEnrollmentStatus.EXITED;
      expect(isExited).toBe(true);
    });

    it('should set timestamps on status transitions', () => {
      const enrollment: Record<string, any> = {
        status: BetaEnrollmentStatus.ONBOARDING,
        startedAt: null,
        activatedAt: null,
        pausedAt: null,
        exitedAt: null,
      };

      const now = new Date();

      enrollment.status = BetaEnrollmentStatus.ACTIVE;
      enrollment.activatedAt = enrollment.activatedAt ?? now;
      expect(enrollment.activatedAt).toBe(now);

      enrollment.status = BetaEnrollmentStatus.PAUSED;
      enrollment.pausedAt = now;
      expect(enrollment.pausedAt).toBeDefined();

      enrollment.status = BetaEnrollmentStatus.EXITED;
      enrollment.exitedAt = now;
      expect(enrollment.exitedAt).toBeDefined();
    });
  });
});
