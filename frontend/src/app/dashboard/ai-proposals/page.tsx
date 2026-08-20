'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { aiProposalService } from '@/services/ai-proposal.service';
import type { AiProposal } from '@/types/ai-proposal';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-yellow-800',
  needs_clarification: 'bg-emerald-100 text-emerald-800',
  confirmed: 'bg-emerald-100 text-green-800',
  rejected: 'bg-rose-100 text-rose-800',
  expired: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  needs_clarification: 'Needs Info',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
};

const sourceLabels: Record<string, string> = {
  whatsapp_text: 'WhatsApp Text',
  whatsapp_voice: 'WhatsApp Voice',
  dashboard: 'Dashboard',
};

export default function AiProposalsPage() {
  const { selectedBusiness, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    setLoading(true);
    aiProposalService
      .getProposals({
        status: statusFilter || undefined,
        page,
        limit: 20,
      })
      .then((res) => {
        if (res.success) {
          setProposals(res.data.items);
          setTotalPages(res.data.pagination.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBusiness, statusFilter, page]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211c]">AI Proposals</h1>
          <p className="text-sm text-slate-500">
            Financial transactions detected from WhatsApp messages
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="needs_clarification">Needs Info</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="">All Sources</option>
            <option value="whatsapp_text">WhatsApp Text</option>
            <option value="whatsapp_voice">WhatsApp Voice</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[1.5rem] bg-slate-200" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No proposals yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Send a financial message on WhatsApp to see proposals here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((p) => (
              <Link
                key={p._id}
                href={`/dashboard/ai-proposals/${p._id}`}
                className="block rounded-[1.5rem] border bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] hover:bg-[#f4f6f3]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || 'bg-slate-100'}`}
                      >
                        {statusLabels[p.status] || p.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.intent?.replace('create_', '')}
                      </span>
                      {p.inputSource && p.inputSource !== 'whatsapp_text' && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          {sourceLabels[p.inputSource] || p.inputSource}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{p.originalText}</p>
                    {p.parsedData && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        {p.parsedData.amount != null && (
                          <span className="font-medium text-slate-700">
                            {p.parsedData.currency || 'LKR'}{' '}
                            {p.parsedData.amount.toLocaleString()}
                          </span>
                        )}
                        {p.parsedData.category && <span>{p.parsedData.category}</span>}
                        {p.parsedData.date && <span>{p.parsedData.date}</span>}
                        {p.parsedData.customer && <span>{p.parsedData.customer}</span>}
                      </div>
                    )}
                    {p.clarificationQuestion && (
                      <p className="mt-2 text-xs italic text-emerald-700">
                        {p.clarificationQuestion}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                    <div className="mt-1">
                      {Math.round(p.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-2xl border px-3 py-1 text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-2xl border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
