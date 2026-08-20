'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/report.service';
import type { PaymentReportData, ReportPeriod } from '@/types/report';

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

export default function PaymentReportPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<PaymentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { period };
      if (period === 'custom' && dateFrom && dateTo) { params.dateFrom = dateFrom; params.dateTo = dateTo; }
      const res = await reportService.getPaymentReport(params);
      if (res.success) setData(res.data);
    } catch {
    } finally { setLoading(false); }
  }, [selectedBusiness, period, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (amountMinor: number, currency = 'LKR') =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amountMinor / 100);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const exportParams: { type: string; format: string; period?: string; dateFrom?: string; dateTo?: string } = {
        type: 'payments', format, period,
      };
      if (period === 'custom' && dateFrom && dateTo) { exportParams.dateFrom = dateFrom; exportParams.dateTo = dateTo; }
      const blob = await reportService.exportReport(exportParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `payments-${period}.csv`; a.click();
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
          <h1 className="text-2xl font-bold text-[#17211c]">Payment Report</h1>
          <p className="mt-1 text-sm text-slate-500">Payment history and method breakdown.</p>
        </div>
        <button onClick={() => handleExport('csv')} disabled={exporting}
          className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          {exporting ? 'Generating...' : 'Export CSV'}
        </button>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
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
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-slate-500">Confirmed Payments</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">{fmt(data.summary.confirmedTotal, data.currency)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-slate-500">Payment Count</p>
              <p className="mt-1 text-lg font-bold text-[#17211c]">{data.summary.paymentCount}</p>
            </div>
          </div>

          {data.methodBreakdown.length > 0 && (
            <div className="mb-6 rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h2 className="mb-3 font-semibold text-[#17211c]">Payment Method Breakdown</h2>
              <div className="space-y-2">
                {data.methodBreakdown.map((m) => (
                  <div key={m.method} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 capitalize">{m.method.replace('_', ' ')}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">{m.count} payments</span>
                      <span className="w-24 text-right text-sm font-medium text-[#17211c]">{fmt(m.amount, data.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.payments.length > 0 ? (
            <div className="rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold text-[#17211c]">Payment History</h2>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.paymentId} className="border-b hover:bg-[#f4f6f3]">
                      <td className="px-4 py-3 text-slate-700">{new Date(p.date).toLocaleDateString('en-LK')}</td>
                      <td className="px-4 py-3 text-[#17211c]">{p.customerName}</td>
                      <td className="px-4 py-3 text-emerald-700">{p.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{p.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.reference}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{fmt(p.amount, data.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-slate-500">No payments recorded for this period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
