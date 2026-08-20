'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/report.service';
import type { ExpenseReportData, ReportPeriod } from '@/types/report';

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

export default function ExpenseReportPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<ExpenseReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { period, page: page.toString(), limit: '15' };
      if (period === 'custom' && dateFrom && dateTo) { params.dateFrom = dateFrom; params.dateTo = dateTo; }
      const res = await reportService.getExpenseReport(params);
      if (res.success) setData(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, period, dateFrom, dateTo, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (amountMinor: number, currency = 'LKR') =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amountMinor / 100);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const exportParams: { type: string; format: string; period?: string; dateFrom?: string; dateTo?: string } = {
        type: 'expenses', format, period,
      };
      if (period === 'custom' && dateFrom && dateTo) { exportParams.dateFrom = dateFrom; exportParams.dateTo = dateTo; }
      const blob = await reportService.exportReport(exportParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `expense-report-${period}.csv`; a.click();
      window.URL.revokeObjectURL(url);
    } catch {
    } finally { setExporting(false); }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-slate-500">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211c]">Expense Report</h1>
          <p className="mt-1 text-sm text-slate-500">Expense breakdown by category and trend.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} disabled={exporting}
            className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">
            {exporting ? 'Generating...' : 'Export CSV'}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting}
            className="rounded-2xl bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
            {exporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Period</label>
            <select value={period} onChange={(e) => { setPeriod(e.target.value as ReportPeriod); setPage(1); }}
              className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
              {periodOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm" />
              </div>
            </>
          )}
        </div>
      </div>

      {data && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-slate-500">Total Expenses</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{fmt(data.total, data.currency)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-slate-500">Transactions</p>
              <p className="mt-1 text-lg font-bold text-[#17211c]">{data.transactionCount}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-slate-500">Average Expense</p>
              <p className="mt-1 text-lg font-bold text-[#17211c]">{fmt(data.averageExpense, data.currency)}</p>
            </div>
          </div>

          {data.categories.length > 0 && (
            <div className="mb-6 rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h2 className="mb-3 font-semibold text-[#17211c]">Expense Breakdown</h2>
              <div className="space-y-2">
                {data.categories.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-rose-500" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="w-16 text-right text-sm text-slate-500">{cat.percentage}%</span>
                      <span className="w-24 text-right text-sm font-medium text-[#17211c]">{fmt(cat.amount, data.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.transactions.length > 0 && (
            <div className="rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold text-[#17211c]">Expense Transactions</h2>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx._id} className="border-b hover:bg-[#f4f6f3]">
                      <td className="px-4 py-3 text-slate-700">{new Date(tx.date).toLocaleDateString('en-LK')}</td>
                      <td className="px-4 py-3 text-[#17211c]">{tx.description || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.categoryName}</td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">{fmt(tx.amount, data.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="rounded-2xl bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">Previous</button>
                  <span className="text-sm text-slate-500">Page {page} of {data.pagination.totalPages}</span>
                  <button onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))} disabled={page === data.pagination.totalPages}
                    className="rounded-2xl bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">Next</button>
                </div>
              )}
            </div>
          )}

          {data.transactions.length === 0 && (
            <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-slate-500">No confirmed expense transactions for this period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
