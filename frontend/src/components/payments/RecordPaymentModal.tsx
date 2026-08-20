'use client';

import { useState } from 'react';
import { paymentService } from '@/services/payment.service';
import { PaymentMethod } from '@/types/transaction';

interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  remainingBalance: number;
  currency: string;
  onPaymentRecorded: () => void;
  onCancel: () => void;
}

export default function RecordPaymentModal({
  invoiceId,
  invoiceNumber,
  remainingBalance,
  currency,
  onPaymentRecorded,
  onCancel,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const decimals = currency === 'JPY' || currency === 'KRW' ? 0 : 2;
  const factor = Math.pow(10, decimals);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    const amountMinor = Math.round(amountNum * factor);

    if (amountMinor > remainingBalance) {
      setError('Payment amount cannot exceed the remaining balance');
      return;
    }

    setSaving(true);
    try {
      await paymentService.recordPayment({
        invoiceId,
        amount: amountNum,
        date,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      onPaymentRecorded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const remainingDisplay = (remainingBalance / factor).toFixed(decimals);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#17211c]">
          Record Payment
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Invoice: {invoiceNumber}
        </p>
        <p className="text-sm text-slate-500">
          Remaining Balance: {currency} {remainingDisplay}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Payment Amount *
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Payment Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Payment Method *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="mobile_payment">Mobile Payment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TRX-12345"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
