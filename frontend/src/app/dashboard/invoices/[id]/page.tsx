'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService } from '@/services/invoice.service';
import { reminderService } from '@/services/reminder.service';
import type { InvoiceDetail } from '@/types/invoice';
import type { Reminder } from '@/types/reminder';
import { formatCurrencyAmount } from '@/utils/financial';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';

export default function InvoiceDetailPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderError, setReminderError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness || !invoiceId) return;
    setLoading(true);
    invoiceService
      .getInvoice(invoiceId)
      .then((res) => {
        if (res.success) setInvoice(res.data);
        else router.push('/dashboard/invoices');
      })
      .catch(() => router.push('/dashboard/invoices'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, invoiceId, router]);

  useEffect(() => {
    if (!invoiceId) return;
    reminderService.getRemindersForInvoice(invoiceId).then((res) => {
      if (res.success) setReminders(res.data);
    }).catch(() => {});
  }, [invoiceId]);

  const handleSendReminder = async () => {
    if (!invoice) return;
    setSendingReminder(true);
    setReminderError('');
    try {
      const res = await reminderService.sendManualReminder(invoice._id);
      if (res.success) {
        setReminders([res.data, ...reminders]);
      } else {
        setReminderError('Failed to send reminder');
      }
    } catch (err) {
      setReminderError(err instanceof Error ? err.message : 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleIssue = async () => {
    if (!invoice) return;
    try {
      await invoiceService.issueInvoice(invoice._id);
      const res = await invoiceService.getInvoice(invoice._id);
      if (res.success) setInvoice(res.data);
    } catch {}
  };

  const handleVoid = async () => {
    if (!invoice) return;
    setVoiding(true);
    try {
      await invoiceService.voidInvoice(invoice._id, voidReason || undefined);
      router.push('/dashboard/invoices');
    } catch {
    } finally {
      setVoiding(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      await invoiceService.getInvoicePdf(invoice._id);
    } catch {}
  };

  const handlePaymentRecorded = async () => {
    setShowPaymentModal(false);
    if (!invoice) return;
    const res = await invoiceService.getInvoice(invoice._id);
    if (res.success) setInvoice(res.data);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!invoice) return null;

  const isDraft = invoice.status === 'draft';
  const isIssued = invoice.status === 'issued';
  const isVoided = invoice.status === 'voided';
  const isPaid = invoice.paymentStatus === 'paid';
  const isOverdue = (invoice as InvoiceDetail & { isOverdue?: boolean }).isOverdue === true;
  const custName = invoice.customerSnapshot?.name || '';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/invoices"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Invoices
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#17211c]">
            {invoice.invoiceNumber}
          </h1>
          <div className="flex gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isDraft
                  ? 'bg-slate-100 text-slate-600'
                  : isVoided
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {invoice.status}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                Overdue
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Customer</p>
            <p className="text-sm text-[#17211c]">{custName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Issue Date</p>
            <p className="text-sm text-[#17211c]">
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Due Date</p>
            <p className="text-sm text-[#17211c]">
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Payment Status</p>
            <p className="text-sm text-[#17211c]">
              {invoice.paymentStatus.replace('_', ' ')}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item._id} className="border-b">
                  <td className="py-2 text-[#17211c]">{item.description}</td>
                  <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-2 text-right text-slate-600">
                    {formatCurrencyAmount(item.rateMinor, invoice.currency)}
                  </td>
                  <td className="py-2 text-right font-medium text-[#17211c]">
                    {formatCurrencyAmount(item.amountMinor, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex justify-end gap-8 text-sm">
            <div className="text-right">
              <p className="text-slate-500">Subtotal</p>
              <p className="font-semibold">{formatCurrencyAmount(invoice.subtotalMinor, invoice.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Total</p>
              <p className="text-lg font-bold">{formatCurrencyAmount(invoice.totalMinor, invoice.currency)}</p>
            </div>
            {invoice.paymentSummary && (
              <>
                <div className="text-right">
                  <p className="text-slate-500">Paid</p>
                  <p className="font-semibold text-emerald-700">{formatCurrencyAmount(invoice.paymentSummary.confirmedPaidMinor, invoice.currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Remaining</p>
                  <p className="font-semibold text-rose-600">{formatCurrencyAmount(invoice.paymentSummary.remainingMinor, invoice.currency)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium text-slate-500">Notes</p>
            <p className="text-sm text-[#17211c]">{invoice.notes}</p>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {isDraft && (
          <>
            <Link
              href={`/dashboard/invoices/${invoice._id}/edit`}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Edit
            </Link>
            <button
              onClick={handleIssue}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Issue Invoice
            </button>
            <button
              onClick={() => setShowVoidDialog(true)}
              className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Void Draft
            </button>
          </>
        )}
        {isIssued && (
          <>
            {!isPaid && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Record Payment
              </button>
            )}
            {!isPaid && (
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Download PDF
            </button>
            <button
              onClick={() => setShowVoidDialog(true)}
              className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Void Invoice
            </button>
          </>
        )}
      </div>

      {reminderError && (
        <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
          {reminderError}
        </div>
      )}

      {reminders.length > 0 && (
        <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-[#17211c]">Reminder History</h3>
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'sent' || r.status === 'delivered' || r.status === 'read'
                        ? 'bg-emerald-50 text-emerald-700'
                        : r.status === 'failed'
                        ? 'bg-rose-50 text-rose-700'
                        : r.status === 'cancelled'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="text-slate-500 capitalize">
                    {r.trigger === 'manual' ? 'Manual' : r.trigger === 'due_date' ? 'Due date' : 'Overdue'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPaymentModal && invoice.paymentSummary && (
        <RecordPaymentModal
          invoiceId={invoice._id}
          invoiceNumber={invoice.invoiceNumber}
          remainingBalance={invoice.paymentSummary.remainingMinor}
          currency={invoice.currency}
          onPaymentRecorded={handlePaymentRecorded}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {showVoidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#17211c]">
              Void this invoice?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {isIssued
                ? 'This issued invoice will be cancelled. Void payments before voiding the invoice.'
                : 'This draft invoice will be permanently deleted.'}
            </p>
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleVoid}
                disabled={voiding}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {voiding ? 'Voiding...' : 'Void Invoice'}
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
