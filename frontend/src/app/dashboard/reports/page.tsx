'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/report.service';
import type { FinancialOverview, ReportPeriod } from '@/types/report';

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

const reportLinks = [
  { href: '/dashboard/reports/income', label: 'Income Report', desc: 'Income breakdown and trends' },
  { href: '/dashboard/reports/expenses', label: 'Expense Report', desc: 'Expense breakdown and categories' },
  { href: '/dashboard/reports/transactions', label: 'Transactions', desc: 'Detailed transaction list' },
  { href: '/dashboard/reports/customers', label: 'Customers', desc: 'Customer financial summary' },
  { href: '/dashboard/reports/invoices', label: 'Invoices', desc: 'Outstanding and overdue' },
  { href: '/dashboard/reports/payments', label: 'Payments', desc: 'Payment history and methods' },
];

export default function ReportsPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadOverview = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { period };
      if (period === 'custom' && dateFrom && dateTo) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      }
      const res = await reportService.getOverview(params);
      if (res.success) setOverview(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, period, dateFrom, dateTo]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const formatCurrency = (amountMinor: number, currency = 'LKR') => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amountMinor / 100);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const exportParams: { type: string; format: string; period?: string; dateFrom?: string; dateTo?: string } = {
        type: 'financial_overview', format, period,
      };
      if (period === 'custom' && dateFrom && dateTo) {
        exportParams.dateFrom = dateFrom;
        exportParams.dateTo = dateTo;
      }
      const blob = await reportService.exportReport(exportParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-overview-${period}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
    } finally {
      setExporting(false);
    }
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
          <h1 className="text-2xl font-bold text-[#17211c]">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Financial overview and detailed reports.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            {exporting ? 'Generating...' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="rounded-2xl bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {exporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Income" value={formatCurrency(overview.income, overview.currency)} color="text-emerald-700" />
          <StatCard label="Expenses" value={formatCurrency(overview.expenses, overview.currency)} color="text-rose-600" />
          <StatCard label="Net Cash Flow" value={formatCurrency(overview.netCashFlow, overview.currency)} color={overview.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
          <StatCard label="Outstanding" value={formatCurrency(overview.outstandingAmount, overview.currency)} color="text-amber-600" />
          <StatCard label="Overdue" value={formatCurrency(overview.overdueAmount, overview.currency)} color="text-rose-600" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
          >
            <h3 className="font-semibold text-[#17211c]">{link.label}</h3>
            <p className="mt-1 text-sm text-slate-500">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
