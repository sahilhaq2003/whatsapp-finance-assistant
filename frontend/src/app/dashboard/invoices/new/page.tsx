'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customer.service';
import { invoiceService } from '@/services/invoice.service';
import type { Customer } from '@/types/customer';
import { CustomerStatus } from '@/types/customer';
import type { CreateInvoiceItemRequest } from '@/types/invoice';

function NewInvoiceForm() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateInvoiceItemRequest[]>([
    { description: '', quantity: '1', rate: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const cid = searchParams.get('customerId');
    if (cid) setCustomerId(cid);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedBusiness) return;
    customerService
      .getCustomers({ status: CustomerStatus.ACTIVE, limit: 100 } as never)
      .then((res) => {
        if (res.success) setCustomers(res.data.items);
      })
      .catch(() => {});
  }, [selectedBusiness]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = item.rate || 0;
      return sum + qty * rate;
    }, 0);
  }, [items]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', rate: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof CreateInvoiceItemRequest,
    value: string | number,
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSave = async (issueImmediately: boolean) => {
    setError('');
    if (!customerId) {
      setError('Please select a customer');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('All items must have a description');
      return;
    }
    if (items.some((i) => parseFloat(i.quantity) <= 0)) {
      setError('All quantities must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      const res = await invoiceService.createInvoice({
        customerId,
        issueDate,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        items,
      });

      if (res.success) {
        if (issueImmediately) {
          const issueRes = await invoiceService.issueInvoice(res.data._id);
          if (issueRes.success) {
            router.push(`/dashboard/invoices/${res.data._id}`);
          }
        } else {
          router.push(`/dashboard/invoices/${res.data._id}`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/invoices"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Invoices
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">Create Invoice</h1>
      </div>

      <form className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Customer *
          </label>
          <div className="flex gap-2">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              required
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}{c.phone ? ` — ${c.phone}` : ''}
                </option>
              ))}
            </select>
            <Link
              href="/dashboard/customers/new"
              className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              + New
            </Link>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Issue Date *
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Items</h3>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                />
                <input
                  type="text"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="w-20 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  value={item.rate || ''}
                  onChange={(e) =>
                    updateItem(index, 'rate', parseFloat(e.target.value) || 0)
                  }
                  className="w-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-2xl bg-rose-50 px-2 py-2 text-sm text-rose-600 hover:bg-rose-100"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 text-sm text-emerald-700 hover:underline"
          >
            + Add Item
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="mb-6 border-t pt-4">
          <div className="flex justify-end gap-8">
            <div className="text-right">
              <p className="text-sm text-slate-500">Subtotal</p>
              <p className="text-lg font-semibold text-[#17211c]">
                {subtotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Issue'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <NewInvoiceForm />
    </Suspense>
  );
}
