'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { transactionService } from '@/services/transaction.service';
import type { Transaction } from '@/types/transaction';
import { formatCurrencyAmount } from '@/utils/financial';

export default function TransactionDetailPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const txId = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness || !txId) return;
    setLoading(true);
    transactionService
      .getTransaction(txId)
      .then((res) => {
        if (res.success) setTransaction(res.data);
      })
      .catch(() => router.push('/dashboard/transactions'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, txId, router]);

  const handleVoid = async () => {
    if (!txId) return;
    setVoiding(true);
    try {
      await transactionService.voidTransaction(txId, {
        reason: voidReason || undefined,
      });
      router.push('/dashboard/transactions');
    } catch {
    } finally {
      setVoiding(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!transaction) return null;

  const catName =
    typeof transaction.categoryId === 'object' && transaction.categoryId !== null
      ? (transaction.categoryId as { name: string }).name
      : '';

  const customerName =
    typeof transaction.customerId === 'object' && transaction.customerId !== null
      ? (transaction.customerId as { name: string }).name
      : '';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/transactions"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Transactions
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">
          Transaction Details
        </h1>
      </div>

      <div className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                transaction.type === 'income'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {transaction.type}
            </span>
            {transaction.status !== 'confirmed' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {transaction.status}
              </span>
            )}
          </div>
          <p
            className={`text-2xl font-bold ${
              transaction.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {transaction.type === 'income' ? '+' : '-'}{' '}
            {formatCurrencyAmount(
              transaction.amountMinor,
              transaction.currency,
            )}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Date</dt>
            <dd className="mt-1 text-sm text-[#17211c]">
              {new Date(transaction.date).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Category</dt>
            <dd className="mt-1 text-sm text-[#17211c]">{catName || '-'}</dd>
          </div>
          {customerName && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Customer</dt>
              <dd className="mt-1 text-sm text-[#17211c]">
                {transaction.customerId &&
                typeof transaction.customerId === 'object' ? (
                  <Link
                    href={`/dashboard/customers/${transaction.customerId._id}`}
                    className="text-emerald-700 hover:underline"
                  >
                    {customerName}
                  </Link>
                ) : (
                  customerName
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-slate-500">Currency</dt>
            <dd className="mt-1 text-sm text-[#17211c]">
              {transaction.currency}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">
              Payment Method
            </dt>
            <dd className="mt-1 text-sm text-[#17211c]">
              {transaction.paymentMethod
                ? transaction.paymentMethod.replace('_', ' ')
                : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Source</dt>
            <dd className="mt-1 text-sm text-[#17211c]">
              {transaction.source === 'whatsapp_voice'
                ? 'WhatsApp Voice'
                : transaction.source === 'whatsapp_text'
                  ? 'WhatsApp Text'
                  : transaction.source === 'import'
                    ? 'Import'
                    : 'Manual'}
            </dd>
          </div>
          {transaction.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Description</dt>
              <dd className="mt-1 text-sm text-[#17211c]">
                {transaction.description}
              </dd>
            </div>
          )}
          {transaction.reference && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Reference</dt>
              <dd className="mt-1 text-sm text-[#17211c]">
                {transaction.reference}
              </dd>
            </div>
          )}
          {transaction.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 text-sm text-[#17211c]">
                {transaction.notes}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-slate-500">Created At</dt>
            <dd className="mt-1 text-sm text-[#17211c]">
              {new Date(transaction.createdAt).toLocaleString()}
            </dd>
          </div>
          {transaction.voidedAt && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Voided At</dt>
              <dd className="mt-1 text-sm text-[#17211c]">
                {new Date(transaction.voidedAt).toLocaleString()}
              </dd>
            </div>
          )}
          {transaction.voidReason && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Void Reason</dt>
              <dd className="mt-1 text-sm text-[#17211c]">
                {transaction.voidReason}
              </dd>
            </div>
          )}
        </dl>

        {transaction.status === 'confirmed' && (
          <div className="mt-6 flex gap-3 border-t pt-6">
            <Link
              href={`/dashboard/transactions/${txId}/edit`}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowVoidDialog(true)}
              className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Void Transaction
            </button>
          </div>
        )}
      </div>

      {showVoidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#17211c]">
              Void this transaction?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This transaction will no longer be included in financial totals,
              but its history will be retained.
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason (optional)
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Transaction entered twice"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleVoid}
                disabled={voiding}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {voiding ? 'Voiding...' : 'Void Transaction'}
              </button>
              <button
                onClick={() => {
                  setShowVoidDialog(false);
                  setVoidReason('');
                }}
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
