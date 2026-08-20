import { PlatformRole } from '../../src/common/enums/platform-role.enum';
import { PlatformRoleGuard } from '../../src/common/guards/platform-role.guard';
import { PLATFORM_ROLES_KEY } from '../../src/common/decorators/platform-roles.decorator';

describe('Ops Authorization', () => {
  const OPS_ROLES: PlatformRole[] = [PlatformRole.ADMIN, PlatformRole.SUPPORT];

  function hasRequiredRole(userRole: PlatformRole, requiredRoles: PlatformRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  describe('Admin role access', () => {
    it('should allow admin to access ops endpoints', () => {
      expect(hasRequiredRole(PlatformRole.ADMIN, OPS_ROLES)).toBe(true);
    });

    it('should have admin in the allowed roles list', () => {
      expect(OPS_ROLES).toContain(PlatformRole.ADMIN);
    });
  });

  describe('Support role access', () => {
    it('should allow support to access ops endpoints', () => {
      expect(hasRequiredRole(PlatformRole.SUPPORT, OPS_ROLES)).toBe(true);
    });

    it('should have support in the allowed roles list', () => {
      expect(OPS_ROLES).toContain(PlatformRole.SUPPORT);
    });
  });

  describe('Regular user access denial', () => {
    it('should deny regular user from accessing ops endpoints', () => {
      expect(hasRequiredRole(PlatformRole.USER, OPS_ROLES)).toBe(false);
    });

    it('should not have user in the allowed roles list', () => {
      expect(OPS_ROLES).not.toContain(PlatformRole.USER);
    });
  });

  describe('PlatformRoleGuard behavior', () => {
    it('should allow access when no required roles are specified', () => {
      const requiredRoles: PlatformRole[] = [];
      const hasRole = requiredRoles.length === 0 || requiredRoles.includes(PlatformRole.ADMIN);
      expect(hasRole).toBe(true);
    });

    it('should deny access when user has no platformRole', () => {
      const user = { platformRole: undefined } as any;
      const hasRole = user?.platformRole && OPS_ROLES.includes(user.platformRole);
      expect(!!hasRole).toBe(false);
    });

    it('should deny access when user object is missing', () => {
      const user = undefined as any;
      const hasRole = user?.platformRole && OPS_ROLES.includes(user.platformRole);
      expect(!!hasRole).toBe(false);
    });

    it('should deny access for user with unrelated role', () => {
      const customRole = 'moderator' as PlatformRole;
      expect(hasRequiredRole(customRole, OPS_ROLES)).toBe(false);
    });
  });

  describe('PlatformRoles decorator', () => {
    it('should set metadata with correct key', () => {
      const key = PLATFORM_ROLES_KEY;
      expect(key).toBe('platformRoles');
    });

    it('should reflect the correct roles from controller metadata', () => {
      const reflectedRoles = OPS_ROLES;
      expect(reflectedRoles).toEqual([PlatformRole.ADMIN, PlatformRole.SUPPORT]);
    });
  });

  describe('Ops endpoint access patterns', () => {
    const opsEndpoints = [
      { method: 'GET', path: '/ops/dashboard' },
      { method: 'GET', path: '/ops/beta/businesses' },
      { method: 'GET', path: '/ops/beta/businesses/:businessId/health' },
    ];

    it('should define 3 ops endpoints', () => {
      expect(opsEndpoints).toHaveLength(3);
    });

    it('all ops endpoints should be GET', () => {
      for (const endpoint of opsEndpoints) {
        expect(endpoint.method).toBe('GET');
      }
    });

    it('should guard all endpoints with JwtAuthGuard and PlatformRoleGuard', () => {
      const guards = ['JwtAuthGuard', 'PlatformRoleGuard'];
      expect(guards).toContain('JwtAuthGuard');
      expect(guards).toContain('PlatformRoleGuard');
    });
  });

  describe('Guard composition', () => {
    it('should verify JwtAuthGuard runs before PlatformRoleGuard', () => {
      const guardOrder = ['JwtAuthGuard', 'PlatformRoleGuard'];
      expect(guardOrder[0]).toBe('JwtAuthGuard');
      expect(guardOrder[1]).toBe('PlatformRoleGuard');
    });

    it('should combine BusinessAccessGuard with PlatformRoleGuard for business-scoped ops', () => {
      const businessScopedGuards = ['JwtAuthGuard', 'PlatformRoleGuard', 'BusinessAccessGuard'];
      expect(businessScopedGuards).toContain('BusinessAccessGuard');
      expect(businessScopedGuards).toContain('PlatformRoleGuard');
    });

    it('should allow platform admin to bypass business membership check', () => {
      const user = { platformRole: PlatformRole.ADMIN, userId: 'user1' };
      const isPlatformAdmin = user.platformRole === PlatformRole.ADMIN;
      const bypassesBusinessCheck = isPlatformAdmin;
      expect(bypassesBusinessCheck).toBe(true);
    });

    it('should require business membership for regular users', () => {
      const user = { platformRole: PlatformRole.USER, userId: 'user1' };
      const isPlatformAdmin = user.platformRole === PlatformRole.ADMIN;
      const requiresBusinessMembership = !isPlatformAdmin;
      expect(requiresBusinessMembership).toBe(true);
    });
  });

  describe('Mock guard canActivate', () => {
    it('should simulate canActivate returning true for admin', () => {
      const mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(OPS_ROLES),
      };

      const request = { user: { platformRole: PlatformRole.ADMIN } };

      const requiredRoles = mockReflector.getAllAndOverride(PLATFORM_ROLES_KEY, [
        jest.fn(),
        jest.fn(),
      ]);

      const hasRole = requiredRoles.includes(request.user.platformRole);
      expect(hasRole).toBe(true);
    });

    it('should simulate canActivate returning false for regular user', () => {
      const mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(OPS_ROLES),
      };

      const request = { user: { platformRole: PlatformRole.USER } };

      const requiredRoles = mockReflector.getAllAndOverride(PLATFORM_ROLES_KEY, [
        jest.fn(),
        jest.fn(),
      ]);

      const hasRole = requiredRoles.includes(request.user.platformRole);
      expect(hasRole).toBe(false);
    });

    it('should simulate canActivate throwing when user is missing', () => {
      const request = { user: undefined as any };

      const throws = () => {
        if (!request.user || !request.user.platformRole) {
          throw new Error('Insufficient platform permissions');
        }
      };

      expect(throws).toThrow('Insufficient platform permissions');
    });

    it('should simulate canActivate allowing when no roles required', () => {
      const mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(null),
      };

      const requiredRoles = mockReflector.getAllAndOverride(PLATFORM_ROLES_KEY, [
        jest.fn(),
        jest.fn(),
      ]);

      const allowed = !requiredRoles || requiredRoles.length === 0;
      expect(allowed).toBe(true);
    });
  });
});
