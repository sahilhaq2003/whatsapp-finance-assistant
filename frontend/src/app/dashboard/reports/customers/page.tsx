'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/report.service';
import type { CustomerReportData } from '@/types/report';

export default function CustomerReportPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CustomerReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const res = await reportService.getCustomerReport();
      if (res.success) setData(res.data);
    } catch {
    } finally { setLoading(false); }
  }, [selectedBusiness]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (amountMinor: number) =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency: data?.currency || 'LKR', minimumFractionDigits: 0 }).format(amountMinor / 100);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-slate-500">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17211c]">Customer Report</h1>
        <p className="mt-1 text-sm text-slate-500">Financial summary per customer.</p>
      </div>

      {data && data.customers.length > 0 ? (
        <div className="rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-[#f4f6f3] text-left text-xs text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Recorded Income</th>
                <th className="px-4 py-3 text-right">Transactions</th>
                <th className="px-4 py-3 text-right">Invoices</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Overdue</th>
                <th className="px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c.customerId} className="border-b hover:bg-[#f4f6f3]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${c.customerId}`} className="font-medium text-emerald-700 hover:underline">
                      {c.customerName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">{fmt(c.confirmedIncome)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{c.transactionCount}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{c.invoiceCount}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmt(c.outstandingAmount)}</td>
                  <td className="px-4 py-3 text-right text-rose-600">{fmt(c.overdueAmount)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {c.lastActivityDate ? new Date(c.lastActivityDate).toLocaleDateString('en-LK') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No customers found.</p>
        </div>
      )}
    </div>
  );
}
