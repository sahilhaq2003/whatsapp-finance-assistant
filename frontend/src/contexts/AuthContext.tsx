'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import type { User, BusinessSummary } from '@/types/auth';

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function normalizeBusiness(business: BusinessSummary): BusinessSummary | null {
  const id =
    typeof business._id === 'string'
      ? business._id
      : String(business._id || '');

  if (!MONGO_OBJECT_ID_PATTERN.test(id)) {
    return null;
  }

  return {
    ...business,
    _id: id,
  };
}

interface AuthContextType {
  user: User | null;
  businesses: BusinessSummary[];
  selectedBusiness: BusinessSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    password: string;
    businessName: string;
    businessType?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  selectBusiness: (business: BusinessSummary) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response.success) {
        const normalizedBusinesses = response.data.businesses
          .map(normalizeBusiness)
          .filter((business): business is BusinessSummary => !!business);

        setUser(response.data.user);
        setBusinesses(normalizedBusinesses);

        const savedBusinessId = localStorage.getItem('dp_selected_business');
        const validSavedBusinessId =
          savedBusinessId && MONGO_OBJECT_ID_PATTERN.test(savedBusinessId)
            ? savedBusinessId
            : null;

        if (savedBusinessId && !validSavedBusinessId) {
          localStorage.removeItem('dp_selected_business');
        }

        if (validSavedBusinessId && normalizedBusinesses.length > 0) {
          const found = normalizedBusinesses.find(
            (b) => b._id === validSavedBusinessId,
          );
          if (found) {
            setSelectedBusiness(found);
          } else if (normalizedBusinesses.length > 0) {
            setSelectedBusiness(normalizedBusinesses[0]);
            localStorage.setItem(
              'dp_selected_business',
              normalizedBusinesses[0]._id,
            );
          }
        } else if (normalizedBusinesses.length > 0) {
          setSelectedBusiness(normalizedBusinesses[0]);
          localStorage.setItem(
            'dp_selected_business',
            normalizedBusinesses[0]._id,
          );
        } else {
          setSelectedBusiness(null);
          localStorage.removeItem('dp_selected_business');
        }
      }
    } catch {
      setUser(null);
      setBusinesses([]);
      setSelectedBusiness(null);
      localStorage.removeItem('dp_selected_business');
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadUser().finally(() => setIsLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadUser]);

  useEffect(() => {
    const handleInvalidBusinessContext = () => {
      setSelectedBusiness(null);
      loadUser();
    };

    window.addEventListener(
      'dp_business_context_invalid',
      handleInvalidBusinessContext,
    );

    return () => {
      window.removeEventListener(
        'dp_business_context_invalid',
        handleInvalidBusinessContext,
      );
    };
  }, [loadUser]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setBusinesses([]);
      setSelectedBusiness(null);
      localStorage.removeItem('dp_selected_business');

      if (window.location.pathname !== '/login') {
        router.push('/login');
      }
    };

    window.addEventListener('dp_auth_expired', handleAuthExpired);

    return () => {
      window.removeEventListener('dp_auth_expired', handleAuthExpired);
    };
  }, [router]);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    if (response.success) {
      await loadUser();
      router.push('/dashboard');
    }
  };

  const register = async (data: {
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    password: string;
    businessName: string;
    businessType?: string;
  }) => {
    const response = await authService.register({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      businessName: data.businessName,
      businessType: data.businessType || 'retail',
    });
    if (response.success) {
      await loadUser();
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setBusinesses([]);
      setSelectedBusiness(null);
      localStorage.removeItem('dp_selected_business');
      router.push('/login');
    }
  };

  const selectBusiness = (business: BusinessSummary) => {
    setSelectedBusiness(business);
    if (MONGO_OBJECT_ID_PATTERN.test(business._id)) {
      localStorage.setItem('dp_selected_business', business._id);
    } else {
      localStorage.removeItem('dp_selected_business');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        businesses,
        selectedBusiness,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        selectBusiness,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
