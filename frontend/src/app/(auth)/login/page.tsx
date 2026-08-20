'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f4f6f3] px-4 py-8 text-[#17211c]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 flex items-center gap-4">
              <Image src="/logo.png" alt="Salligo" width={96} height={96} className="rounded-3xl shadow-xl shadow-emerald-600/20" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Finance workspace
            </p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight">
              Run your business numbers with confidence.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-500">
              Sign in to review income, expenses, invoices, transactions, and
              assistant insights in one clean operating dashboard.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold text-slate-500">Income</p>
                <p className="mt-2 text-xl font-semibold text-emerald-700">
                  +18%
                </p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold text-slate-500">
                  Invoices
                </p>
                <p className="mt-2 text-xl font-semibold">24</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold text-slate-500">
                  Expenses
                </p>
                <p className="mt-2 text-xl font-semibold text-rose-600">
                  62%
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-8 text-center">
            <span className="mx-auto lg:hidden">
              <Image src="/logo.png" alt="Salligo" width={120} height={120} className="rounded-3xl shadow-xl shadow-emerald-600/20" />
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#17211c] lg:mt-0">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to your Salligo workspace.
            </p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
