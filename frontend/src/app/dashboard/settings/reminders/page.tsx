'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { reminderService } from '@/services/reminder.service';
import type { ReminderRule, ReminderStats } from '@/types/reminder';

export default function RemindersSettingsPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    loadData();
  }, [selectedBusiness]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, statsRes] = await Promise.all([
        reminderService.getRules(),
        reminderService.getStats(),
      ]);
      if (rulesRes.success) setRules(rulesRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (rule: ReminderRule) => {
    setSaving(rule._id);
    try {
      const res = await reminderService.updateRule(rule._id, {
        isEnabled: !rule.isEnabled,
      });
      if (res.success) {
        setRules(rules.map((r) => (r._id === rule._id ? res.data : r)));
      }
    } catch {
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateOffset = async (rule: ReminderRule, offsetDays: number) => {
    setSaving(rule._id);
    try {
      const res = await reminderService.updateRule(rule._id, { offsetDays });
      if (res.success) {
        setRules(rules.map((r) => (r._id === rule._id ? res.data : r)));
      }
    } catch {
    } finally {
      setSaving(null);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await reminderService.triggerScan();
      await loadData();
    } catch {
    } finally {
      setScanning(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const dueDateRule = rules.find((r) => r.trigger === 'due_date');
  const postDueRule = rules.find((r) => r.trigger === 'post_due');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/settings/whatsapp')}
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Settings
        </button>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">Payment Reminders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Automatically remind customers about upcoming and overdue invoice payments via WhatsApp.
        </p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
            <p className="text-2xl font-bold text-[#17211c]">{stats.total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
            <p className="text-2xl font-bold text-emerald-700">{stats.scheduled}</p>
            <p className="text-xs text-slate-500">Scheduled</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
            <p className="text-2xl font-bold text-emerald-700">{stats.sent}</p>
            <p className="text-xs text-slate-500">Sent</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
            <p className="text-2xl font-bold text-emerald-700">{stats.delivered}</p>
            <p className="text-xs text-slate-500">Delivered</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
            <p className="text-2xl font-bold text-rose-600">{stats.failed}</p>
            <p className="text-xs text-slate-500">Failed</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
            <p className="text-2xl font-bold text-slate-400">{stats.cancelled}</p>
            <p className="text-xs text-slate-500">Cancelled</p>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17211c]">Due Date Reminders</h2>
            <p className="text-sm text-slate-500">
              Send a reminder before the invoice due date
            </p>
          </div>
          <button
            onClick={() => dueDateRule && handleToggleRule(dueDateRule)}
            disabled={!dueDateRule || saving === dueDateRule?._id}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              dueDateRule?.isEnabled ? 'bg-emerald-600' : 'bg-slate-200'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                dueDateRule?.isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {dueDateRule && (
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm text-slate-600">Remind</label>
            <select
              value={dueDateRule.offsetDays}
              onChange={(e) => handleUpdateOffset(dueDateRule, Number(e.target.value))}
              disabled={saving === dueDateRule._id}
              className="rounded-2xl border border-slate-200 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? 's' : ''} before
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-500">due date</span>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17211c]">Overdue Reminders</h2>
            <p className="text-sm text-slate-500">
              Send a reminder after the invoice becomes overdue
            </p>
          </div>
          <button
            onClick={() => postDueRule && handleToggleRule(postDueRule)}
            disabled={!postDueRule || saving === postDueRule?._id}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              postDueRule?.isEnabled ? 'bg-emerald-600' : 'bg-slate-200'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                postDueRule?.isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {postDueRule && (
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm text-slate-600">Remind</label>
            <select
              value={postDueRule.offsetDays}
              onChange={(e) => handleUpdateOffset(postDueRule, Number(e.target.value))}
              disabled={saving === postDueRule._id}
              className="rounded-2xl border border-slate-200 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? 's' : ''} after
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-500">due date</span>
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17211c]">Manual Scan</h2>
            <p className="text-sm text-slate-500">
              Manually trigger a scan of all outstanding invoices to schedule reminders
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-[#f4f6f3] p-4">
        <p className="text-xs text-slate-500">
          Reminder history is available on each invoice&apos;s detail page. Manual reminders have a
          configurable cooldown between sends. All reminders are sent via WhatsApp template messages
          which must be approved in your Meta Business account.
        </p>
      </div>
    </div>
  );
}
