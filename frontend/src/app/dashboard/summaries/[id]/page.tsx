'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { summaryService } from '@/services/summary.service';
import type { FinancialSummary } from '@/types/financial-summary';

export default function SummaryDetailPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const summaryId = params.id as string;

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness || !summaryId) return;
    setLoading(true);
    summaryService.getSummary(summaryId)
      .then((res) => {
        if (res.success) setSummary(res.data);
        else router.push('/dashboard/summaries');
      })
      .catch(() => router.push('/dashboard/summaries'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, summaryId, router]);

  const handleSend = async () => {
    if (!summary) return;
    setSending(true);
    try {
      await summaryService.send(summary._id);
      const res = await summaryService.getSummary(summary._id);
      if (res.success) setSummary(res.data);
    } catch {
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: summary?.currency || 'LKR',
      minimumFractionDigits: 0,
    }).format(amountMinor / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'long',
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

  if (!summary) return null;

  const isDelivered = summary.status === 'sent' || summary.status === 'delivered' || summary.status === 'read';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/summaries"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Summaries
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#17211c]">
            {summary.frequency === 'daily' ? 'Daily' : 'Weekly'} Summary
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isDelivered
                  ? 'bg-emerald-50 text-emerald-700'
                  : summary.status === 'failed'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {summary.status}
            </span>
            {summary.status === 'generated' && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-1 text-sm font-medium text-slate-500">Period</h2>
        <p className="text-[#17211c]">
          {formatDate(summary.periodStart)}
          {summary.periodStart !== summary.periodEnd && ` – ${formatDate(summary.periodEnd)}`}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          This summary shows the figures that were generated and sent at that time.
        </p>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-sm font-semibold text-[#17211c]">Financial Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Income</span>
            <span className="font-medium text-emerald-700">{formatCurrency(summary.incomeMinor)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Expenses</span>
            <span className="font-medium text-rose-600">{formatCurrency(summary.expenseMinor)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="font-medium text-slate-700">Net Cash Flow</span>
            <span className={`font-bold ${summary.netCashFlowMinor >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(summary.netCashFlowMinor)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Transactions</span>
            <span className="font-medium text-[#17211c]">{summary.transactionCount}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-sm font-semibold text-[#17211c]">Invoices</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Outstanding</span>
            <span className="font-medium text-[#17211c]">
              {formatCurrency(summary.outstandingAmountMinor)} across {summary.outstandingInvoiceCount} invoice{summary.outstandingInvoiceCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Overdue</span>
            <span className="font-medium text-rose-600">
              {formatCurrency(summary.overdueAmountMinor)} across {summary.overdueInvoiceCount} invoice{summary.overdueInvoiceCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {summary.topExpenseCategories && summary.topExpenseCategories.length > 0 && (
        <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#17211c]">Top Expense Categories</h2>
          <div className="space-y-2">
            {summary.topExpenseCategories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {i + 1}. {cat.name}
                </span>
                <span className="font-medium text-[#17211c]">{formatCurrency(cat.amountMinor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[1.5rem] bg-[#f4f6f3] p-4">
        <p className="text-xs text-slate-500">
          Generated at: {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : 'N/A'}
          {summary.sentAt && <> · Sent at: {new Date(summary.sentAt).toLocaleString()}</>}
          {summary.deliveredAt && <> · Delivered at: {new Date(summary.deliveredAt).toLocaleString()}</>}
        </p>
      </div>
    </div>
  );
}
