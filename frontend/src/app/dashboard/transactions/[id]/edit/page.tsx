'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { transactionService } from '@/services/transaction.service';
import { categoryService } from '@/services/category.service';
import { customerService } from '@/services/customer.service';
import type { Category } from '@/types/category';
import type { Customer } from '@/types/customer';
import { CustomerStatus } from '@/types/customer';
import { TransactionType, PaymentMethod } from '@/types/transaction';

export default function EditTransactionPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const txId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness || !txId) return;
    setLoading(true);

    Promise.all([
      transactionService.getTransaction(txId),
      categoryService.getCategories(),
    ])
      .then(([txRes, catRes]) => {
        if (txRes.success) {
          const tx = txRes.data;
          setType(tx.type);
          // amountMinor -> display amount
          const decimals =
            tx.currency === 'JPY' || tx.currency === 'KRW' ? 0 : 2;
          const factor = Math.pow(10, decimals);
          setAmount(String(tx.amountMinor / factor));
          setDate(tx.date.split('T')[0]);
          setDescription(tx.description || '');
          setPaymentMethod(tx.paymentMethod || '');
          setReference(tx.reference || '');
          setNotes(tx.notes || '');

          if (
            typeof tx.categoryId === 'object' &&
            tx.categoryId !== null
          ) {
            setCategoryId((tx.categoryId as { _id: string })._id);
          } else {
            setCategoryId(tx.categoryId as string);
          }

          if (tx.customerId && typeof tx.customerId === 'object') {
            setCustomerId((tx.customerId as { _id: string })._id);
          } else {
            setCustomerId((tx.customerId as string) || '');
          }
        } else {
          router.push('/dashboard/transactions');
        }
      })
      .catch(() => router.push('/dashboard/transactions'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, txId, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    categoryService
      .getCategories(type)
      .then((res) => {
        if (res.success) setCategories(res.data);
      })
      .catch(() => {});
  }, [selectedBusiness, type]);

  useEffect(() => {
    if (!selectedBusiness) return;
    if (type === TransactionType.INCOME) {
      customerService
        .getCustomers({ status: CustomerStatus.ACTIVE, limit: 100 })
        .then((res) => {
          if (res.success) setCustomers(res.data.items);
        })
        .catch(() => {});
    } else {
      setCustomerId('');
    }
  }, [selectedBusiness, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setSaving(true);
    try {
      const res = await transactionService.updateTransaction(txId, {
        type,
        amount: parseFloat(amount),
        categoryId,
        customerId: type === TransactionType.INCOME && customerId ? customerId : undefined,
        date,
        description: description || undefined,
        paymentMethod: (paymentMethod as PaymentMethod) || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      if (res.success) {
        router.push(`/dashboard/transactions/${txId}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/transactions/${txId}`}
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Transaction
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">
          Edit Transaction
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
      >
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Transaction Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value={TransactionType.EXPENSE}
                checked={type === TransactionType.EXPENSE}
                onChange={() => setType(TransactionType.EXPENSE)}
                className="h-4 w-4 text-emerald-700"
              />
              <span className="text-sm">Expense</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value={TransactionType.INCOME}
                checked={type === TransactionType.INCOME}
                onChange={() => setType(TransactionType.INCOME)}
                className="h-4 w-4 text-emerald-700"
              />
              <span className="text-sm">Income</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            required
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            required
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {type === TransactionType.INCOME && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Customer (optional)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            >
              <option value="">No customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            required
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="">Select payment method</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="mobile_payment">Mobile Payment</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reference
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Transaction'}
          </button>
          <Link
            href={`/dashboard/transactions/${txId}`}
            className="rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
