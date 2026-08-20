'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { transactionService } from '@/services/transaction.service';
import { categoryService } from '@/services/category.service';
import type {
  Transaction,
  TransactionType,
  Pagination,
} from '@/types/transaction';
import type { Category } from '@/types/category';
import { formatAmountWithSign } from '@/utils/financial';

export default function TransactionsPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadTransactions = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, limit: 20 };
      if (filterType) filters.type = filterType;
      if (filterCategory) filters.categoryId = filterCategory;
      if (filterSearch) filters.search = filterSearch;

      const res = await transactionService.getTransactions(filters as never);
      if (res.success) {
        setTransactions(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, page, filterType, filterCategory, filterSearch]);

  useEffect(() => {
    if (!selectedBusiness) return;
    categoryService.getCategories().then((res) => {
      if (res.success) setCategories(res.data);
    }).catch(() => {});
  }, [selectedBusiness]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
        <h1 className="text-2xl font-bold text-[#17211c]">Transactions</h1>
        <Link
          href="/dashboard/transactions/new"
          className="inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add Transaction
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as TransactionType | '');
            setPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="">All Categories</option>
          {categories
            .filter((c) => !filterType || (c.type as string) === filterType)
            .map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={filterSearch}
          onChange={(e) => {
            setFilterSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No transactions yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Record your first income or expense to start tracking your business
            finances.
          </p>
          <Link
            href="/dashboard/transactions/new"
            className="mt-4 inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Add Transaction
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                      Category
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.map((tx) => {
                    const catName =
                      typeof tx.categoryId === 'object' && tx.categoryId !== null
                        ? (tx.categoryId as { name: string }).name
                        : '';
                    const custName =
                      typeof tx.customerId === 'object' && tx.customerId !== null
                        ? (tx.customerId as { name: string }).name
                        : '';
                    return (
                      <tr
                        key={tx._id}
                        className="cursor-pointer hover:bg-[#f4f6f3]"
                        onClick={() =>
                          router.push(`/dashboard/transactions/${tx._id}`)
                        }
                      >
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-500">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-[#17211c]">
                          {tx.description || catName || '-'}
                        </td>
                        <td className="hidden whitespace-nowrap px-6 py-3 text-sm text-slate-500 sm:table-cell">
                          {catName}
                        </td>
                        <td className="hidden whitespace-nowrap px-6 py-3 text-sm text-slate-500 sm:table-cell">
                          {custName || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              tx.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap px-6 py-3 text-right text-sm font-semibold ${
                            tx.type === 'income'
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatAmountWithSign(
                            tx.amountMinor,
                            tx.currency,
                            tx.type,
                          )}
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
