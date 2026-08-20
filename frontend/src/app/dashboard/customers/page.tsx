'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customer.service';
import type { Customer, Pagination } from '@/types/customer';
import { CustomerStatus } from '@/types/customer';

export default function CustomersPage() {
  const {
    selectedBusiness,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');
  const [page, setPage] = useState(1);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadCustomers = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, limit: 20 };
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;

      const res = await customerService.getCustomers(filters as never);
      if (res.success) {
        setCustomers(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, page, search, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {}, 300);
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
        <h1 className="text-2xl font-bold text-[#17211c]">Customers</h1>
        <Link
          href="/dashboard/customers/new"
          className="inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add Customer
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CustomerStatus | '');
            setPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="">Active</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No customers yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Add customers to keep track of their sales, payments and invoices.
          </p>
          <Link
            href="/dashboard/customers/new"
            className="mt-4 inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Add Customer
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#f4f6f3]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Name
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                      Phone
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {customers.map((c) => (
                    <tr
                      key={c._id}
                      className="cursor-pointer hover:bg-[#f4f6f3]"
                      onClick={() =>
                        router.push(`/dashboard/customers/${c._id}`)
                      }
                    >
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#17211c]">
                        {c.name}
                      </td>
                      <td className="hidden whitespace-nowrap px-6 py-3 text-sm text-slate-500 sm:table-cell">
                        {c.phone || '-'}
                      </td>
                      <td className="hidden whitespace-nowrap px-6 py-3 text-sm text-slate-500 md:table-cell">
                        {c.email || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
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
