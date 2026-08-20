'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { transactionService } from '@/services/transaction.service';
import { categoryService } from '@/services/category.service';
import { customerService } from '@/services/customer.service';
import type { Category, CategoryType } from '@/types/category';
import type { Customer } from '@/types/customer';
import { CustomerStatus } from '@/types/customer';
import { TransactionType, PaymentMethod } from '@/types/transaction';

export default function NewTransactionPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    categoryService
      .getCategories(type)
      .then((res) => {
        if (res.success) {
          setCategories(res.data);
          setCategoryId('');
        }
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

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await categoryService.createCategory({
        name: newCatName.trim(),
        type: type as unknown as CategoryType,
      });
      if (res.success) {
        setCategories((prev) => [...prev, res.data]);
        setCategoryId(res.data._id);
        setNewCatName('');
        setShowNewCategory(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  };

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
    if (!date) {
      setError('Please select a date');
      return;
    }

    setSaving(true);
    try {
      const res = await transactionService.createTransaction({
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
        router.push('/dashboard/transactions');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
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
          href="/dashboard/transactions"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Transactions
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">
          Add Transaction
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
            placeholder="0.00"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            required
          />
        </div>

        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Category
            </label>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="text-sm text-emerald-700 hover:underline"
            >
              + Add Category
            </button>
          </div>

          {showNewCategory && (
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="flex-1 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={creatingCat || !newCatName.trim()}
                className="rounded-2xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creatingCat ? 'Adding...' : 'Add'}
              </button>
            </div>
          )}

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
            placeholder="e.g. Office supplies"
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
            placeholder="e.g. Receipt number"
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
            placeholder="Additional notes..."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Transaction'}
          </button>
          <Link
            href="/dashboard/transactions"
            className="rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
