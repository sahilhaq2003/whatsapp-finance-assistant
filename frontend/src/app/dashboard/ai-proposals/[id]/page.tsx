'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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

export default function AiProposalDetailPage() {
  const { selectedBusiness, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!selectedBusiness || !proposalId) return;
    setLoading(true);
    aiProposalService
      .getProposal(proposalId)
      .then((res) => {
        if (res.success) {
          setProposal(res.data);
          setEditAmount(res.data.parsedData.amount?.toString() || '');
          setEditCategory(res.data.parsedData.category || '');
          setEditDate(res.data.parsedData.date || '');
          setEditDescription(res.data.parsedData.description || '');
          setEditCustomer(res.data.parsedData.customer || '');
          setEditPaymentMethod(res.data.parsedData.paymentMethod || '');
        }
      })
      .catch(() => setError('Failed to load proposal'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, proposalId]);

  const handleConfirm = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await aiProposalService.confirmProposal(proposalId);
      if (res.success) {
        setProposal(res.data.proposal);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await aiProposalService.rejectProposal(proposalId);
      if (res.success) {
        setProposal(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await aiProposalService.updateProposal(proposalId, {
        amount: editAmount ? parseFloat(editAmount) : undefined,
        category: editCategory || undefined,
        date: editDate || undefined,
        description: editDescription || undefined,
        customer: editCustomer || undefined,
        paymentMethod: editPaymentMethod || undefined,
      });
      if (res.success) {
        setProposal(res.data.proposal);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <p className="text-slate-500">Proposal not found.</p>
        <Link href="/dashboard/ai-proposals" className="mt-4 inline-block text-emerald-700 hover:underline">
          Back to Proposals
        </Link>
      </div>
    );
  }

  const isPending = proposal.status === 'pending' || proposal.status === 'needs_clarification';
  const isExpired = proposal.expiresAt && new Date(proposal.expiresAt) < new Date();

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/ai-proposals" className="text-sm text-emerald-700 hover:underline">
          &larr; Back to Proposals
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">Proposal Detail</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[1.5rem] border bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[proposal.status] || 'bg-slate-100'}`}
                >
                  {statusLabels[proposal.status] || proposal.status}
                </span>
                <span className="text-xs text-slate-400">
                  {proposal.intent?.replace('create_', '')}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {Math.round(proposal.confidence * 100)}% confidence
              </span>
            </div>

            <div className="mb-4 rounded-2xl bg-[#f4f6f3] p-4">
              <p className="text-sm font-medium text-slate-700">Original Message</p>
              <p className="mt-1 text-sm text-slate-600">{proposal.originalText}</p>
            </div>

            {proposal.inputSource && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs text-slate-500">Source:</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  proposal.inputSource === 'whatsapp_voice'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {sourceLabels[proposal.inputSource] || proposal.inputSource}
                </span>
              </div>
            )}

            {proposal.inputSource === 'whatsapp_voice' && proposal.transcript && (
              <div className="mb-4 rounded-2xl bg-purple-50 p-4">
                <p className="text-sm font-medium text-purple-700">Transcript</p>
                <p className="mt-1 text-sm text-purple-600 italic">&ldquo;{proposal.transcript}&rdquo;</p>
              </div>
            )}

            {proposal.clarificationQuestion && (
              <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">Clarification Needed</p>
                <p className="mt-1 text-sm text-emerald-700">{proposal.clarificationQuestion}</p>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Customer</label>
                  <input
                    type="text"
                    value={editCustomer}
                    onChange={(e) => setEditCustomer(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="mobile_payment">Mobile Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={actionLoading}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">Extracted Data</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-medium text-[#17211c] capitalize">
                      {proposal.parsedData.type || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Amount</dt>
                    <dd className="font-medium text-[#17211c]">
                      {proposal.parsedData.amount != null
                        ? `${proposal.parsedData.currency || 'LKR'} ${proposal.parsedData.amount.toLocaleString()}`
                        : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Category</dt>
                    <dd className="font-medium text-[#17211c]">{proposal.parsedData.category || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Date</dt>
                    <dd className="font-medium text-[#17211c]">{proposal.parsedData.date || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Description</dt>
                    <dd className="font-medium text-[#17211c]">{proposal.parsedData.description || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Customer</dt>
                    <dd className="font-medium text-[#17211c]">{proposal.parsedData.customer || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Payment Method</dt>
                    <dd className="font-medium text-[#17211c] capitalize">
                      {proposal.parsedData.paymentMethod?.replace('_', ' ') || '-'}
                    </dd>
                  </div>
                </dl>

                {isPending && !isExpired && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-3 text-sm text-emerald-700 hover:underline"
                  >
                    Edit fields
                  </button>
                )}
              </div>
            )}
          </div>

          {proposal.validationErrors && proposal.validationErrors.length > 0 && (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-yellow-800">Validation Errors</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-700">
                {proposal.validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isPending && !isExpired && (
            <div className="rounded-[1.5rem] border bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm & Save Transaction'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="w-full rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="rounded-[1.5rem] border bg-[#f4f6f3] p-4">
              <p className="text-sm text-slate-600">
                This proposal has expired. Send the transaction again on WhatsApp.
              </p>
            </div>
          )}

          {proposal.status === 'confirmed' && proposal.confirmedTransactionId && (
            <div className="rounded-[1.5rem] border bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-700">Transaction Created</p>
              <Link
                href={`/dashboard/transactions/${proposal.confirmedTransactionId}`}
                className="mt-2 inline-block text-sm text-emerald-700 hover:underline"
              >
                View Transaction &rarr;
              </Link>
            </div>
          )}

          <div className="rounded-[1.5rem] border bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-[#17211c]">{new Date(proposal.createdAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Expires</dt>
                <dd className="text-[#17211c]">{new Date(proposal.expiresAt).toLocaleString()}</dd>
              </div>
              {proposal.confirmedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Confirmed</dt>
                  <dd className="text-[#17211c]">{new Date(proposal.confirmedAt).toLocaleString()}</dd>
                </div>
              )}
              {proposal.rejectedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Rejected</dt>
                  <dd className="text-[#17211c]">{new Date(proposal.rejectedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {proposal.revisionHistory && proposal.revisionHistory.length > 0 && (
            <div className="rounded-[1.5rem] border bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Revision History</h3>
              <div className="space-y-3">
                {proposal.revisionHistory.map((rev, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    <p className="font-medium">{new Date(rev.timestamp).toLocaleString()}</p>
                    <p className="mt-1 truncate text-slate-400">{rev.sourceText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
