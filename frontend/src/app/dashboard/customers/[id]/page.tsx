'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customer.service';
import { invoiceService } from '@/services/invoice.service';
import type {
  Customer,
  CustomerFinancialSummary,
  CustomerTransactionHistory,
} from '@/types/customer';
import type { Invoice } from '@/types/invoice';
import { CustomerStatus } from '@/types/customer';
import { formatCurrencyAmount } from '@/utils/financial';

export default function CustomerDetailPage() {
  const {
    selectedBusiness,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerFinancialSummary | null>(
    null,
  );
  const [transactions, setTransactions] =
    useState<CustomerTransactionHistory | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness || !customerId) return;
    setLoading(true);

    Promise.all([
      customerService.getCustomer(customerId),
      customerService.getCustomerSummary(customerId),
      customerService.getCustomerTransactions(customerId, { limit: 10 }),
      invoiceService.getInvoices({ customerId, limit: '5' }),
    ])
      .then(([custRes, sumRes, txRes, invRes]) => {
        if (custRes.success) setCustomer(custRes.data);
        if (sumRes.success) setSummary(sumRes.data);
        if (txRes.success) setTransactions(txRes.data);
        if (invRes.success) setInvoices(invRes.data.items);
      })
      .catch(() => router.push('/dashboard/customers'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, customerId, router]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await customerService.archiveCustomer(customerId);
      router.push('/dashboard/customers');
    } catch {
    } finally {
      setArchiving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!customer) return null;

  const isArchived = customer.status === 'archived';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Customers
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#17211c]">
            {customer.name}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isArchived
                ? 'bg-slate-100 text-slate-600'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {customer.status}
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Total Received</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">
            {summary
              ? formatCurrencyAmount(summary.totalReceived, summary.currency)
              : '-'}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Outstanding Balance</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">
            {summary
              ? formatCurrencyAmount(summary.outstandingBalance, summary.currency)
              : '-'}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Invoices</p>
          <p className="mt-1 text-xl font-semibold text-[#17211c]">
            {summary ? summary.invoiceCount : '-'}
            {summary && summary.outstandingInvoiceCount > 0 && (
              <span className="ml-1 text-sm text-orange-500">
                ({summary.outstandingInvoiceCount} outstanding)
              </span>
            )}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Transactions</p>
          <p className="mt-1 text-xl font-semibold text-[#17211c]">
            {summary ? summary.confirmedTransactionCount : '-'}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-lg font-semibold text-[#17211c]">
          Contact Details
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Phone</dt>
            <dd className="text-sm text-[#17211c]">
              {customer.phone || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="text-sm text-[#17211c]">
              {customer.email || '-'}
            </dd>
          </div>
          {customer.address && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Address</dt>
              <dd className="text-sm text-[#17211c]">
                {[
                  customer.address.line1,
                  customer.address.line2,
                  customer.address.city,
                  customer.address.district,
                  customer.address.postalCode,
                  customer.address.country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </dd>
            </div>
          )}
          {customer.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Notes</dt>
              <dd className="text-sm text-[#17211c]">{customer.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {invoices.length > 0 && (
        <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#17211c]">Invoices</h2>
            <Link
              href={`/dashboard/invoices?customerId=${customerId}`}
              className="text-sm text-emerald-700 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y">
            {invoices.map((inv) => (
              <Link
                key={inv._id}
                href={`/dashboard/invoices/${inv._id}`}
                className="flex items-center justify-between py-3 hover:bg-[#f4f6f3]"
              >
                <div>
                  <p className="text-sm font-medium text-[#17211c]">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(inv.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#17211c]">
                    {formatCurrencyAmount(inv.totalMinor, inv.currency)}
                  </p>
                  <p className={`text-xs ${
                    inv.paymentStatus === 'paid'
                      ? 'text-emerald-700'
                      : inv.paymentStatus === 'partially_paid'
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}>
                    {inv.paymentStatus.replace('_', ' ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-lg font-semibold text-[#17211c]">
          Transaction History
        </h2>
        {!transactions || transactions.items.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <div className="divide-y">
            {transactions.items.map((tx) => {
              const catName =
                typeof tx.categoryId === 'object' && tx.categoryId !== null
                  ? (tx.categoryId as { name: string }).name
                  : '';
              return (
                <Link
                  key={tx._id}
                  href={`/dashboard/transactions/${tx._id}`}
                  className="flex items-center justify-between py-3 hover:bg-[#f4f6f3]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#17211c]">
                      {tx.description || catName || tx.type}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}{' '}
                    {formatCurrencyAmount(tx.amountMinor, tx.currency)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/dashboard/customers/${customerId}/edit`}
          className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Edit Customer
        </Link>
        <Link
          href={`/dashboard/invoices/new?customerId=${customerId}`}
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create Invoice
        </Link>
        {isArchived ? (
          <button
            onClick={async () => {
              try {
                await customerService.restoreCustomer(customerId);
                setCustomer({ ...customer, status: CustomerStatus.ACTIVE });
              } catch {}
            }}
            className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Restore Customer
          </button>
        ) : (
          <button
            onClick={() => setShowArchiveDialog(true)}
            className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Archive Customer
          </button>
        )}
      </div>

      {showArchiveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#17211c]">
              Archive this customer?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              The customer will no longer appear in active customer lists, but
              their transaction history will be kept.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {archiving ? 'Archiving...' : 'Archive Customer'}
              </button>
              <button
                onClick={() => setShowArchiveDialog(false)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
