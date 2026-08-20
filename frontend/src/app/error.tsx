'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f3]">
      <div className="max-w-md rounded-[1.5rem] bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
        <h2 className="text-xl font-bold text-[#17211c]">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
