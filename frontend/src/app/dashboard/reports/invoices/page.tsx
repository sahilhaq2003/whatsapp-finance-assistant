'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/report.service';
import type { OutstandingInvoiceData, OverdueInvoiceData } from '@/types/report';

type Tab = 'outstanding' | 'overdue';

export default function InvoiceReportPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('outstanding');
  const [outstanding, setOutstanding] = useState<OutstandingInvoiceData | null>(null);
  const [overdue, setOverdue] = useState<OverdueInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const [osRes, odRes] = await Promise.all([
        reportService.getOutstandingInvoices(),
        reportService.getOverdueInvoices(),
      ]);
      if (osRes.success) setOutstanding(osRes.data);
      if (odRes.success) setOverdue(odRes.data);
    } catch {
    } finally { setLoading(false); }
  }, [selectedBusiness]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (amountMinor: number, currency = 'LKR') =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amountMinor / 100);

  const handleExport = async (format: 'csv' | 'pdf', type: string) => {
    setExporting(true);
    try {
      const blob = await reportService.exportReport({ type, format });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${type}-report.csv`; a.click();
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
          <h1 className="text-2xl font-bold text-[#17211c]">Invoice Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Outstanding and overdue invoices.</p>
        </div>
        <button onClick={() => handleExport('csv', tab === 'outstanding' ? 'outstanding_invoices' : 'overdue_invoices')} disabled={exporting}
          className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          {exporting ? 'Generating...' : 'Export CSV'}
        </button>
      </div>

      <div className="mb-6 flex gap-1 rounded-[1.5rem] bg-slate-100 p-1">
        {(['outstanding', 'overdue'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-[#17211c] shadow-[0_18px_60px_rgba(15,23,42,0.06)]' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t === 'outstanding' ? 'Outstanding' : 'Overdue'}
          </button>
        ))}
      </div>

      {tab === 'outstanding' && outstanding && (
        <>
          <div className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-slate-500">Total Outstanding</p>
                <p className="text-lg font-bold text-amber-600">{fmt(outstanding.summary.outstandingAmount, outstanding.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoice Count</p>
                <p className="text-lg font-bold text-[#17211c]">{outstanding.summary.invoiceCount}</p>
              </div>
            </div>
          </div>
          {outstanding.invoices.length > 0 ? (
            <div className="rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.invoices.map((inv) => (
                    <tr key={inv.invoiceId} className="border-b hover:bg-[#f4f6f3]">
                      <td className="px-4 py-3 font-medium text-emerald-700">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{inv.customerName}</td>
                      <td className="px-4 py-3 text-slate-700">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-LK') : '-'}</td>
                      <td className="px-4 py-3 text-right text-[#17211c]">{fmt(inv.total, outstanding.currency)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{fmt(inv.paid, outstanding.currency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-amber-600">{fmt(inv.remaining, outstanding.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {inv.isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-slate-500">No outstanding invoices.</p>
            </div>
          )}
        </>
      )}

      {tab === 'overdue' && overdue && (
        <>
          <div className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-slate-500">Total Overdue</p>
                <p className="text-lg font-bold text-rose-600">{fmt(overdue.summary.overdueAmount, overdue.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoice Count</p>
                <p className="text-lg font-bold text-[#17211c]">{overdue.summary.invoiceCount}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-3">
            {[
              { label: '1-7 Days', value: overdue.aging['1to7'] },
              { label: '8-30 Days', value: overdue.aging['8to30'] },
              { label: '31-60 Days', value: overdue.aging['31to60'] },
              { label: '61+ Days', value: overdue.aging['61plus'] },
            ].map((bucket) => (
              <div key={bucket.label} className="rounded-[1.5rem] bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
                <p className="text-xs text-slate-500">{bucket.label}</p>
                <p className="mt-1 text-sm font-bold text-rose-600">{fmt(bucket.value, overdue.currency)}</p>
              </div>
            ))}
          </div>

          {overdue.invoices.length > 0 ? (
            <div className="rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.invoices.map((inv) => {
                    const days = inv.dueDate
                      ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const bucket = days <= 7 ? '1-7 Days' : days <= 30 ? '8-30 Days' : days <= 60 ? '31-60 Days' : '61+ Days';
                    return (
                      <tr key={inv.invoiceId} className="border-b hover:bg-[#f4f6f3]">
                        <td className="px-4 py-3 font-medium text-emerald-700">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{inv.customerName}</td>
                        <td className="px-4 py-3 text-slate-700">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-LK') : '-'}</td>
                        <td className="px-4 py-3 text-right text-[#17211c]">{fmt(inv.total, overdue.currency)}</td>
                        <td className="px-4 py-3 text-right font-medium text-rose-600">{fmt(inv.remaining, overdue.currency)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">{bucket}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-slate-500">No overdue invoices.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
