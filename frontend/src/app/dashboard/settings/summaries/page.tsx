'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { summaryService } from '@/services/summary.service';
import type { SummaryPreference, SummaryPreview } from '@/types/financial-summary';

const WEEKLY_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function SummariesSettingsPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [prefs, setPrefs] = useState<SummaryPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyPreview, setDailyPreview] = useState<SummaryPreview | null>(null);
  const [weeklyPreview, setWeeklyPreview] = useState<SummaryPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    setLoading(true);
    summaryService.getPreferences()
      .then((res) => { if (res.success) setPrefs(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBusiness]);

  const handleUpdate = async (updates: Partial<SummaryPreference>) => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await summaryService.updatePreferences(updates);
      if (res.success) setPrefs(res.data);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (frequency: 'daily' | 'weekly') => {
    setPreviewLoading(true);
    try {
      const res = await summaryService.preview(frequency);
      if (res.success) {
        if (frequency === 'daily') setDailyPreview(res.data);
        else setWeeklyPreview(res.data);
      }
    } catch {
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: prefs?.timezone ? 'LKR' : 'LKR',
      minimumFractionDigits: 0,
    }).format(amountMinor / 100);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/settings/whatsapp')}
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Settings
        </button>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">Financial Summaries</h1>
        <p className="mt-1 text-sm text-slate-500">
          Receive automated daily and weekly financial summaries via WhatsApp.
        </p>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-lg font-semibold text-[#17211c]">Timezone</h2>
        <p className="text-sm text-slate-500">
          Scheduled summaries use your business timezone:
          <span className="ml-1 font-medium text-slate-700">{prefs.timezone}</span>
        </p>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17211c]">Daily Summary</h2>
            <p className="text-sm text-slate-500">Receive a summary at the end of each day</p>
          </div>
          <button
            onClick={() => handleUpdate({ dailyEnabled: !prefs.dailyEnabled })}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.dailyEnabled ? 'bg-emerald-600' : 'bg-slate-200'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.dailyEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {prefs.dailyEnabled && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-600">Send at</label>
              <select
                value={prefs.dailySendHour}
                onChange={(e) => handleUpdate({ dailySendHour: Number(e.target.value) })}
                disabled={saving}
                className="rounded-2xl border border-slate-200 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Include in summary:</p>
              <div className="space-y-2">
                {[
                  { key: 'includeIncome', label: 'Income' },
                  { key: 'includeExpenses', label: 'Expenses' },
                  { key: 'includeNetCashFlow', label: 'Net Cash Flow' },
                  { key: 'includeTransactionCount', label: 'Transaction Count' },
                  { key: 'includeOutstandingInvoices', label: 'Outstanding Invoices' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={(prefs as any)[key]}
                      onChange={(e) => handleUpdate({ [key]: e.target.checked })}
                      disabled={saving}
                      className="rounded border-slate-200 text-emerald-700 focus:ring-emerald-500/10"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => handlePreview('daily')}
              disabled={previewLoading}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {previewLoading ? 'Loading...' : 'Preview Today'}
            </button>

            {dailyPreview && (
              <div className="rounded-2xl bg-[#f4f6f3] p-4 text-sm text-slate-700">
                <p className="mb-2 font-medium">Preview:</p>
                <p>Income: {formatCurrency(dailyPreview.income)}</p>
                <p>Expenses: {formatCurrency(dailyPreview.expenses)}</p>
                <p>Net Cash Flow: {formatCurrency(dailyPreview.netCashFlow)}</p>
                <p>Transactions: {dailyPreview.transactionCount}</p>
                <p>Outstanding: {formatCurrency(dailyPreview.outstandingAmount)} across {dailyPreview.outstandingInvoiceCount} invoices</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17211c]">Weekly Summary</h2>
            <p className="text-sm text-slate-500">Receive a weekly summary every week</p>
          </div>
          <button
            onClick={() => handleUpdate({ weeklyEnabled: !prefs.weeklyEnabled })}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.weeklyEnabled ? 'bg-emerald-600' : 'bg-slate-200'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.weeklyEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {prefs.weeklyEnabled && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-600">Send on</label>
              <select
                value={prefs.weeklyDay}
                onChange={(e) => handleUpdate({ weeklyDay: e.target.value as any })}
                disabled={saving}
                className="rounded-2xl border border-slate-200 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {WEEKLY_DAYS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
              <label className="text-sm text-slate-600">at</label>
              <select
                value={prefs.weeklySendHour}
                onChange={(e) => handleUpdate({ weeklySendHour: Number(e.target.value) })}
                disabled={saving}
                className="rounded-2xl border border-slate-200 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Include in summary:</p>
              <div className="space-y-2">
                {[
                  { key: 'includeIncome', label: 'Income' },
                  { key: 'includeExpenses', label: 'Expenses' },
                  { key: 'includeNetCashFlow', label: 'Net Cash Flow' },
                  { key: 'includeOutstandingInvoices', label: 'Outstanding Invoices' },
                  { key: 'includeOverdueInvoices', label: 'Overdue Invoices' },
                  { key: 'includeTopCategories', label: 'Top Categories' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={(prefs as any)[key]}
                      onChange={(e) => handleUpdate({ [key]: e.target.checked })}
                      disabled={saving}
                      className="rounded border-slate-200 text-emerald-700 focus:ring-emerald-500/10"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => handlePreview('weekly')}
              disabled={previewLoading}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {previewLoading ? 'Loading...' : 'Preview This Week'}
            </button>

            {weeklyPreview && (
              <div className="rounded-2xl bg-[#f4f6f3] p-4 text-sm text-slate-700">
                <p className="mb-2 font-medium">Preview:</p>
                <p>Income: {formatCurrency(weeklyPreview.income)}</p>
                <p>Expenses: {formatCurrency(weeklyPreview.expenses)}</p>
                <p>Net Cash Flow: {formatCurrency(weeklyPreview.netCashFlow)}</p>
                <p>Transactions: {weeklyPreview.transactionCount}</p>
                <p>Outstanding: {formatCurrency(weeklyPreview.outstandingAmount)} across {weeklyPreview.outstandingInvoiceCount} invoices</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-[#f4f6f3] p-4">
        <p className="text-xs text-slate-500">
          Financial summaries are calculated from your confirmed transactions and invoices.
          Values are based on data recorded in the system and may differ from external records.
          Sent summaries are historical snapshots and will not change if data is later modified.
        </p>
      </div>
    </div>
  );
}
