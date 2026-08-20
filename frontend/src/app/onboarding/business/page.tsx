'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingBusinessPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f3]">
      <p className="text-sm text-slate-500">Redirecting...</p>
    </div>
  );
}
