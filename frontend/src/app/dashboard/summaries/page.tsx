'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { summaryService } from '@/services/summary.service';
import type { FinancialSummary } from '@/types/financial-summary';

export default function SummariesPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [summaries, setSummaries] = useState<FinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    loadSummaries();
  }, [selectedBusiness, page]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const res = await summaryService.getSummaries({ page, limit: 15 });
      if (res.success) {
        setSummaries(res.data.items);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (frequency: 'daily' | 'weekly') => {
    setGenerating(true);
    try {
      await summaryService.generate(frequency);
      await loadSummaries();
    } catch {
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amountMinor / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211c]">Financial Summaries</h1>
          <p className="mt-1 text-sm text-slate-500">
            View your history of generated financial summaries.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('daily')}
            disabled={generating}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Daily'}
          </button>
          <Link
            href="/dashboard/settings/summaries"
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Settings
          </Link>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No summaries generated yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Enable scheduled summaries in Settings, or generate one now.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3 text-right">Income</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s._id} className="border-b hover:bg-[#f4f6f3]">
                  <td className="px-4 py-3 text-[#17211c]">
                    {formatDate(s.periodStart)}
                    {s.periodStart !== s.periodEnd && ` – ${formatDate(s.periodEnd)}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 capitalize">
                      {s.frequency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(s.incomeMinor)}</td>
                  <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(s.expenseMinor)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${s.netCashFlowMinor >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(s.netCashFlowMinor)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === 'sent' || s.status === 'delivered' || s.status === 'read'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'failed'
                          ? 'bg-rose-50 text-rose-700'
                          : s.status === 'skipped'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/summaries/${s._id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-2xl bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-2xl bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
