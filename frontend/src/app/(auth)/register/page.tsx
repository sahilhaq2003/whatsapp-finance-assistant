'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  const { businesses, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && businesses.length > 0) {
      router.push('/dashboard');
    }
  }, [businesses.length, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f3] px-4 text-[#17211c]">
        <div className="w-full max-w-md rounded-[2rem] border border-white bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center">
            <Image src="/logo.png" alt="Salligo" width={56} height={56} className="rounded-2xl" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            No business workspace found
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This signed-in account does not have a business attached. Sign out
            and create a fresh account so your business workspace is created
            during signup.
          </p>
          <button
            onClick={logout}
            className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Sign out and create workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f3] px-4 py-8 text-[#17211c]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_520px]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 flex items-center gap-3">
              <Image src="/logo.png" alt="Salligo" width={48} height={48} className="rounded-2xl shadow-lg shadow-emerald-600/20" />
              <div>
                <p className="text-lg font-semibold tracking-tight">
                  Salligo
                </p>
                <p className="text-sm font-medium text-slate-500">
                  WhatsApp-first business finance assistant
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Start your workspace
            </p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight">
              Set up cleaner finance operations from day one.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-500">
              Create an account to capture daily transactions, manage invoices,
              and keep business cash flow visible from one polished dashboard.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold text-slate-500">
                  Capture
                </p>
                <p className="mt-2 text-xl font-semibold text-emerald-700">
                  Chat
                </p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold text-slate-500">
                  Review
                </p>
                <p className="mt-2 text-xl font-semibold">Books</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold text-slate-500">
                  Collect
                </p>
                <p className="mt-2 text-xl font-semibold text-amber-600">
                  Faster
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-8 text-center">
            <span className="mx-auto lg:hidden">
              <Image src="/logo.png" alt="Salligo" width={56} height={56} className="rounded-2xl shadow-lg shadow-emerald-600/20" />
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#17211c] lg:mt-0">
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Open your Salligo workspace.
            </p>
          </div>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
