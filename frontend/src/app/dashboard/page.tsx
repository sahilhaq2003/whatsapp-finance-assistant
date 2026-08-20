'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService } from '@/services/invoice.service';
import { transactionService } from '@/services/transaction.service';
import { whatsappService } from '@/services/whatsapp.service';
import type { InvoiceSummary } from '@/types/invoice';
import type { Transaction, TransactionSummary } from '@/types/transaction';
import { formatAmountWithSign, formatCurrencyAmount } from '@/utils/financial';

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export default function DashboardPage() {
  const {
    user,
    selectedBusiness,
    businesses,
    isLoading,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(
    null,
  );
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!selectedBusiness || !MONGO_OBJECT_ID_PATTERN.test(selectedBusiness._id)) {
      return;
    }

    const now = new Date();
    const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    Promise.all([
      transactionService.getTransactionSummary(dateFrom, dateTo),
      transactionService.getTransactions({
        limit: 6,
        status: undefined as never,
      }),
      invoiceService.getOutstandingSummary(),
    ])
      .then(([summaryRes, txRes, invRes]) => {
        if (summaryRes.success) setSummary(summaryRes.data);
        if (txRes.success) setRecentTransactions(txRes.data.items);
        if (invRes.success) setInvoiceSummary(invRes.data);
      })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));

    whatsappService
      .getConnection()
      .then((res) => {
        setWhatsappConnected(res.success && res.data.connected);
      })
      .catch(() => setWhatsappConnected(false));
  }, [selectedBusiness]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  if (!selectedBusiness && businesses.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
            W
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#101816]">
            No business workspace found
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your dashboard needs a business workspace. Sign out and create a
            new account so the business is created during signup.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="mt-6 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Fix workspace
          </button>
        </div>
      </div>
    );
  }

  const currency = selectedBusiness?.baseCurrency || 'LKR';
  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
  const netCashFlow = summary?.netCashFlow || 0;
  const transactionCount = summary?.transactionCount || 0;
  const outstandingAmount = invoiceSummary?.outstandingAmount || 0;
  const overdueAmount = invoiceSummary?.overdueAmount || 0;
  const invoiceCurrency = invoiceSummary?.currency || currency;
  const businessType = selectedBusiness?.businessType
    ? selectedBusiness.businessType.replace(/_/g, ' ')
    : 'Business';
  const chartIncome = [58, 66, 64, 74, 73, 82, 78, 86, 79, 71, 85, 85];
  const chartExpenses = [52, 45, 50, 54, 57, 55, 59, 48, 52, 53, 49, 45];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0d4336] text-xl font-bold uppercase text-white">
                {(selectedBusiness?.name || 'B').slice(0, 1)}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Current business workspace
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101816]">
                  {selectedBusiness?.name || 'Business workspace'}
                </h1>
                <p className="mt-1 text-sm capitalize text-slate-500">
                  {businessType} dashboard managed by {user.firstName}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/whatsapp"
              className="inline-flex justify-center rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Business settings
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Business details
          </p>
          <div className="mt-4 space-y-3">
            <DashboardBusinessDetail label="Currency" value={currency} />
            <DashboardBusinessDetail
              label="Your role"
              value={selectedBusiness?.role || 'Owner'}
            />
            <DashboardBusinessDetail
              label="Login phone"
              value={user.phone || 'Not set'}
            />
          </div>
        </div>
      </section>

      {whatsappConnected === false && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              W
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Connect WhatsApp
              </p>
              <p className="text-xs text-emerald-700">
                Link your business WhatsApp to start recording transactions via chat.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/whatsapp/setup"
            className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Setup →
          </Link>
        </div>
      )}

      {loadingSummary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-[118px] animate-pulse rounded-2xl border border-slate-100 bg-white"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="New net income"
            value={formatAmountWithSign(netCashFlow, currency, netCashFlow >= 0 ? 'income' : 'expense')}
            delta="10.5%"
            footer={`${formatCurrencyAmount(income, currency)} income`}
            tone={netCashFlow >= 0 ? 'emerald' : 'rose'}
            href="/dashboard/reports/income"
          />
          <KpiCard
            label="Monthly expenses"
            value={formatAmountWithSign(expenses, currency, 'expense')}
            delta="13.5%"
            footer={`${transactionCount} records this month`}
            tone="emerald"
            href="/dashboard/reports/expenses"
          />
          <KpiCard
            label="Outstanding invoices"
            value={`${invoiceSummary?.outstandingInvoiceCount || 0}`}
            delta="0.5%"
            footer={`${formatCurrencyAmount(outstandingAmount, invoiceCurrency)} unpaid`}
            tone="rose"
            href="/dashboard/invoices"
          />
          <KpiCard
            label="Recent transactions"
            value={`${transactionCount}`}
            delta="25.1%"
            footer={`${recentTransactions.length} latest loaded`}
            tone="emerald"
            href="/dashboard/transactions"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">
        <section className="rounded-2xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Overall cash flow
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-[#101816]">
                  {formatCurrencyAmount(income - expenses, currency)}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                  10.5%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-xl border border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                Dashboard
              </span>
              <span className="rounded-xl border border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                All categories
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-5 flex flex-wrap justify-end gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Income
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500/60" />
                Expenses
              </span>
            </div>
            <div className="relative h-[280px] overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-b from-emerald-50/60 to-white px-4 py-5">
              <div className="absolute inset-x-4 top-8 h-px bg-slate-100" />
              <div className="absolute inset-x-4 top-24 h-px bg-slate-100" />
              <div className="absolute inset-x-4 top-40 h-px bg-slate-100" />
              <div className="absolute inset-x-4 top-56 h-px bg-slate-100" />
              <div className="flex h-full items-end gap-3">
                {chartIncome.map((bar, index) => (
                  <div key={index} className="flex flex-1 items-end gap-1">
                    <div
                      className="w-full rounded-t-lg bg-emerald-300/70"
                      style={{ height: `${bar}%` }}
                    />
                    <div
                      className="w-full rounded-t-lg bg-teal-600/40"
                      style={{ height: `${chartExpenses[index]}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <div className="border-b border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Collection rate
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#101816]">74%</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                0.5%
              </span>
            </div>
          </div>
          <div className="divide-y divide-slate-100 p-5">
            <InvoiceLine
              label="Outstanding amount"
              helper={`${invoiceSummary?.outstandingInvoiceCount || 0} invoices`}
              value={formatCurrencyAmount(outstandingAmount, invoiceCurrency)}
            />
            <InvoiceLine
              label="Overdue amount"
              helper={`${invoiceSummary?.overdueInvoiceCount || 0} overdue`}
              value={formatCurrencyAmount(overdueAmount, invoiceCurrency)}
            />
            <InvoiceLine
              label="Transactions logged"
              helper="This month"
              value={`${transactionCount}`}
            />
            <InvoiceLine
              label="Net cash position"
              helper={netCashFlow >= 0 ? 'Positive' : 'Needs review'}
              value={formatCurrencyAmount(Math.abs(netCashFlow), currency)}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <div className="border-b border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Assistant plan
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#101816]">
              Finance Automation
            </h3>
          </div>
          <div className="p-5">
            <p className="text-sm leading-6 text-slate-600">
              Supercharge daily finance capture with WhatsApp entries, invoice
              reminders, summaries, and assistant proposals.
            </p>
            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-100">
              <div className="border-r border-slate-100 p-4 text-center">
                <p className="text-xs text-slate-500">Accuracy</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">79%</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500">Tools</p>
                <p className="mt-1 text-lg font-bold text-[#101816]">30+</p>
              </div>
            </div>
            <Link
              href="/dashboard/assistant"
              className="mt-5 inline-flex w-full justify-center rounded-xl bg-[#0d4336] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a392f]"
            >
              Open assistant
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Recent transactions
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#101816]">
                  {recentTransactions.length}
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                  +12
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/transactions/new"
                className="rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
              >
                New
              </Link>
              <Link
                href="/dashboard/transactions"
                className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              >
                View all
              </Link>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-700">
                No transactions yet.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Add income or expenses to populate your dashboard.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="text-xs font-semibold text-slate-400">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3">Transaction info</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx) => {
                    const catName =
                      typeof tx.categoryId === 'object' &&
                      tx.categoryId !== null
                        ? (tx.categoryId as { name: string }).name
                        : '';
                    return (
                      <tr key={tx._id} className="hover:bg-emerald-50/30">
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/transactions/${tx._id}`}
                            className="font-semibold text-[#101816] hover:text-emerald-700"
                          >
                            {tx.description || catName || tx.type}
                          </Link>
                          <p className="mt-1 text-xs capitalize text-slate-400">
                            {tx.type}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {catName || 'Uncategorized'}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td
                          className={`px-5 py-4 text-right text-sm font-bold ${
                            tx.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatAmountWithSign(
                            tx.amountMinor,
                            tx.currency,
                            tx.type,
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  footer,
  tone,
  href,
}: {
  label: string;
  value: string;
  delta: string;
  footer: string;
  tone: 'emerald' | 'rose';
  href: string;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-600'
      : 'bg-rose-50 text-rose-600';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_10px_30px_rgba(15,40,32,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {label}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold tracking-tight text-[#101816]">
              {value}
            </p>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${toneClass}`}>
              {delta}
            </span>
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-500">
          +
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#101816]">{footer}</span>
        <Link href={href} className="text-lg font-bold text-[#101816]">
          -
        </Link>
      </div>
    </div>
  );
}

function InvoiceLine({
  label,
  helper,
  value,
}: {
  label: string;
  helper: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-[#101816]">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      </div>
      <p className="text-sm font-bold text-[#101816]">{value}</p>
    </div>
  );
}

function DashboardBusinessDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold capitalize text-[#101816]">
        {value}
      </span>
    </div>
  );
}
