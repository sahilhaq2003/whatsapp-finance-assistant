'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService } from '@/services/invoice.service';
import type { Invoice, Pagination } from '@/types/invoice';
import { InvoicePaymentStatus } from '@/types/invoice';
import { formatCurrencyAmount } from '@/utils/financial';

export default function InvoicesPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadInvoices = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;

      const res = await invoiceService.getInvoices(params);
      if (res.success) {
        setInvoices(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, page, search, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const getPaymentStatusDisplay = (inv: Invoice) => {
    const today = new Date();
    const isOverdue =
      inv.status === 'issued' &&
      inv.paymentStatus !== 'paid' &&
      inv.dueDate &&
      new Date(inv.dueDate) < today;

    if (isOverdue) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
          Overdue
        </span>
      );
    }

    const colors: Record<string, string> = {
      unpaid: 'bg-amber-50 text-amber-700',
      partially_paid: 'bg-emerald-50 text-emerald-700',
      paid: 'bg-emerald-50 text-emerald-700',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          colors[inv.paymentStatus] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {inv.paymentStatus.replace('_', ' ')}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#17211c]">Invoices</h1>
        <Link
          href="/dashboard/invoices/new"
          className="inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Create Invoice
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-2xl border border-slate-200 px-3 py-1.5 text-sm sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="voided">Voided</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => {
            setPaymentStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="">All Payment</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No invoices yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Create your first invoice to start tracking customer payments.
          </p>
          <Link
            href="/dashboard/invoices/new"
            className="mt-4 inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Create Invoice
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#f4f6f3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Invoice
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                      Customer
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">
                      Date
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">
                      Due
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoices.map((inv) => {
                    const custName =
                      typeof inv.customerId === 'object' && inv.customerId !== null
                        ? (inv.customerId as { name: string }).name
                        : inv.customerSnapshot?.name || '';
                    return (
                      <tr
                        key={inv._id}
                        className="cursor-pointer hover:bg-[#f4f6f3]"
                        onClick={() =>
                          router.push(`/dashboard/invoices/${inv._id}`)
                        }
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[#17211c]">
                          {inv.invoiceNumber}
                          {inv.status !== 'issued' && (
                            <span className="ml-2 text-xs text-slate-400">
                              ({inv.status})
                            </span>
                          )}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-500 sm:table-cell">
                          {custName}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-500 md:table-cell">
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-500 md:table-cell">
                          {inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[#17211c]">
                          {formatCurrencyAmount(inv.totalMinor, inv.currency)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                          {getPaymentStatusDisplay(inv)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-2xl border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page === pagination.totalPages}
                  className="rounded-2xl border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
