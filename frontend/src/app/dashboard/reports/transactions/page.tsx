'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/report.service';
import type { TransactionReportData, ReportPeriod } from '@/types/report';

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

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'whatsapp_text', label: 'WhatsApp Text' },
  { value: 'whatsapp_voice', label: 'WhatsApp Voice' },
  { value: 'import', label: 'Import' },
];

export default function TransactionReportPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [data, setData] = useState<TransactionReportData | null>(null);
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
      const params: Record<string, string | number> = { period, page: page.toString(), limit: '20' };
      if (period === 'custom' && dateFrom && dateTo) { params.dateFrom = dateFrom; params.dateTo = dateTo; }
      if (typeFilter) params.type = typeFilter;
      const res = await reportService.getTransactionReport(params);
      if (res.success) setData(res.data);
    } catch {
    } finally { setLoading(false); }
  }, [selectedBusiness, period, dateFrom, dateTo, typeFilter, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (amountMinor: number) =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency: data?.currency || 'LKR', minimumFractionDigits: 0 }).format(amountMinor / 100);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const exportParams: { type: string; format: string; period?: string; dateFrom?: string; dateTo?: string } = {
        type: 'transactions', format, period,
      };
      if (period === 'custom' && dateFrom && dateTo) { exportParams.dateFrom = dateFrom; exportParams.dateTo = dateTo; }
      const blob = await reportService.exportReport(exportParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `transactions-${period}.${format}`; a.click();
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
          <h1 className="text-2xl font-bold text-[#17211c]">Transaction Report</h1>
          <p className="mt-1 text-sm text-slate-500">Detailed transaction list with filters.</p>
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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
              {typeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Source</label>
            <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
              {sourceOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
        </div>
      </div>

      {data && (
        <>
          {data.transactions.length > 0 ? (
            <div className="rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions
                    .filter((tx) => !sourceFilter || tx.source === sourceFilter)
                    .map((tx) => (
                    <tr key={tx._id} className="border-b hover:bg-[#f4f6f3]">
                      <td className="px-4 py-3 text-slate-700">{new Date(tx.date).toLocaleDateString('en-LK')}</td>
                      <td className="px-4 py-3 text-[#17211c]">{tx.description || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.customerName}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.categoryName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>{tx.type}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{tx.source}</td>
                      <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {fmt(tx.amount)}
                      </td>
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
          ) : (
            <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-slate-500">No confirmed transactions for this period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
