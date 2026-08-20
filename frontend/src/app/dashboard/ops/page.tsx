'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';

interface OpsDashboard {
  totalBusinesses: number;
  totalBetaEnrollments: number;
  activeBetaEnrollments: number;
  totalFeedback: number;
  newFeedback: number;
}

interface BetaBusiness {
  businessId: string;
  businessName: string;
  ownerName: string;
  cohort: string;
  enrollmentStatus: string;
  startedAt: string | null;
  transactionCount: number;
  invoiceCount: number;
}

interface FeedbackItem {
  _id: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function OpsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<OpsDashboard | null>(null);
  const [businesses, setBusinesses] = useState<BetaBusiness[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');

    Promise.all([
      api.get<{ data: OpsDashboard }>('/ops/dashboard'),
      api.get<{ data: BetaBusiness[] }>('/ops/beta/businesses'),
      api.get<{ data: FeedbackItem[] }>('/feedback?status=new'),
    ])
      .then(([dashRes, bizRes, fbRes]) => {
        setDashboard(dashRes.data);
        setBusinesses(bizRes.data);
        setFeedback(fbRes.data);
      })
      .catch(() => setError('Failed to load operations data. Access may be restricted to admin/support roles.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

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
        <h1 className="text-2xl font-bold text-[#17211c]">Operations Dashboard</h1>
        <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'inactive': return 'bg-slate-100 text-slate-600';
      case 'churned': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17211c]">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Beta program overview, usage, and feedback queue.</p>
      </div>

      {dashboard && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card label="Total Businesses" value={dashboard.totalBusinesses} />
          <Card label="Beta Enrollments" value={dashboard.totalBetaEnrollments} />
          <Card label="Active Beta" value={dashboard.activeBetaEnrollments} />
          <Card label="Total Feedback" value={dashboard.totalFeedback} />
          <Card label="New Feedback" value={dashboard.newFeedback} />
        </div>
      )}

      <div className="mb-6 rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-3 font-semibold text-[#17211c]">Beta Businesses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-500">
                <th className="pb-2 font-medium">Business</th>
                <th className="pb-2 font-medium">Owner</th>
                <th className="pb-2 font-medium">Cohort</th>
                <th className="pb-2 font-medium">Transactions</th>
                <th className="pb-2 font-medium">Invoices</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.businessId} className="border-b last:border-0">
                  <td className="py-2 font-medium text-[#17211c]">{b.businessName}</td>
                  <td className="py-2 text-slate-500">{b.ownerName}</td>
                  <td className="py-2 text-slate-500">{b.cohort}</td>
                  <td className="py-2 text-slate-500">{b.transactionCount}</td>
                  <td className="py-2 text-slate-500">{b.invoiceCount}</td>
                  <td className="py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(b.enrollmentStatus)}`}>
                      {b.enrollmentStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">No beta businesses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="mb-3 font-semibold text-[#17211c]">New Feedback</h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-slate-400">No new feedback items.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f._id} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#17211c]">{f.category}</span>
                  <span className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{f.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#17211c]">{value}</p>
    </div>
  );
}
