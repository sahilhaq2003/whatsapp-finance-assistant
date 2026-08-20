'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';

interface UsageData {
  customers_created: number;
  invoices_created: number;
  ai_requests: number;
  voice_minutes: number;
  reminders_sent: number;
  exports_created: number;
  billing_period: { start: string; end: string };
}

interface EntitlementsData {
  plan: string;
  limits: {
    customers: number;
    invoices: number;
    ai_requests: number;
    voice_minutes: number;
    reminders: number;
    exports: number;
  };
}

const metrics = [
  { key: 'customers_created' as const, label: 'Customers Created', limit: 'customers' as const },
  { key: 'invoices_created' as const, label: 'Invoices Created', limit: 'invoices' as const },
  { key: 'ai_requests' as const, label: 'AI Requests', limit: 'ai_requests' as const },
  { key: 'voice_minutes' as const, label: 'Voice Minutes', limit: 'voice_minutes' as const },
  { key: 'reminders_sent' as const, label: 'Reminders Sent', limit: 'reminders' as const },
  { key: 'exports_created' as const, label: 'Exports Created', limit: 'exports' as const },
];

export default function UsagePage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError('');

    Promise.all([
      api.get<{ data: UsageData }>('/usage'),
      api.get<{ data: EntitlementsData }>('/entitlements'),
    ])
      .then(([usageRes, entitlementsRes]) => {
        setUsage(usageRes.data);
        setEntitlements(entitlementsRes.data);
      })
      .catch(() => setError('Failed to load usage data.'))
      .finally(() => setLoading(false));
  }, [selectedBusiness]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <p className="text-center text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17211c]">Usage &amp; Quotas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Billing period usage for {selectedBusiness?.name}
        </p>
        {usage && (
          <p className="mt-1 text-xs text-slate-400">
            {new Date(usage.billing_period.start).toLocaleDateString()} &ndash;{' '}
            {new Date(usage.billing_period.end).toLocaleDateString()}
          </p>
        )}
      </div>

      {entitlements && (
        <div className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-700">
            Current Plan: <span className="font-bold text-[#17211c]">{entitlements.plan}</span>
          </p>
        </div>
      )}

      <div className="space-y-4">
        {metrics.map(({ key, label, limit }) => {
          const used = usage?.[key] ?? 0;
          const max = entitlements?.limits?.[limit] ?? 0;
          const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
          const barColor =
            pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

          return (
            <div key={key} className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-sm text-slate-500">
                  {used} / {max}
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">{pct.toFixed(1)}% used</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
