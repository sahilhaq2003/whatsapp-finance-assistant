'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';

interface DataRequest {
  _id: string;
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
}

export default function PrivacyPage() {
  const { selectedBusiness, user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState('');
  const [success, setSuccess] = useState('');

  // Deletion dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadRequests = async () => {
    if (!selectedBusiness) return;
    try {
      const res = await api.get<{ data: DataRequest[] }>('/data-requests');
      setRequests(res.data);
    } catch {
      setError('Failed to load data requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) loadRequests();
  }, [selectedBusiness]);

  const requestExport = async () => {
    if (!selectedBusiness) return;
    setSubmitting('export');
    setError('');
    setSuccess('');
    try {
      await api.post('/data-requests/export', { businessId: selectedBusiness._id });
      setSuccess('Data export requested. You will receive an email when it is ready.');
      loadRequests();
    } catch {
      setError('Failed to request data export.');
    } finally {
      setSubmitting('');
    }
  };

  const requestDeletion = async () => {
    if (!selectedBusiness || !user) return;
    setDeleteError('');

    if (deleteConfirmName !== selectedBusiness.name) {
      setDeleteError(`Type "${selectedBusiness.name}" to confirm.`);
      return;
    }

    setSubmitting('deletion');
    try {
      await api.post('/data-requests/deletion', {
        businessId: selectedBusiness._id,
        reason: deleteReason,
      });
      setShowDeleteDialog(false);
      setDeleteReason('');
      setDeleteConfirmName('');
      setSuccess('Account deletion requested. Our team will review it.');
      loadRequests();
    } catch {
      setDeleteError('Failed to request account deletion.');
    } finally {
      setSubmitting('');
    }
  };

  const statusColor = (status: DataRequest['status']) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'processing': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-rose-100 text-rose-700';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17211c]">Privacy &amp; Data</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your data and privacy settings.</p>
      </div>

      {error && <p className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
      {success && <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="font-semibold text-[#17211c]">Export Your Data</h2>
          <p className="mt-1 text-sm text-slate-500">
            Download a copy of all your business data in a machine-readable format.
          </p>
          <button
            onClick={requestExport}
            disabled={submitting === 'export'}
            className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting === 'export' ? 'Requesting...' : 'Request Data Export'}
          </button>
        </div>

        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="font-semibold text-[#17211c]">Delete Account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
          >
            Request Account Deletion
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <Link href="/policies/data-retention" className="text-sm text-emerald-700 hover:underline">
          View Data Retention Policy &rarr;
        </Link>
      </div>

      {requests.length > 0 && (
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="mb-3 font-semibold text-[#17211c]">Request History</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-500">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} className="border-b last:border-0">
                  <td className="py-2 capitalize">{r.type}</td>
                  <td className="py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-[#17211c]">Confirm Account Deletion</h3>
            <p className="mt-2 text-sm text-slate-600">
              This action is irreversible. All your business data will be permanently deleted.
            </p>

            <label className="mt-4 block text-sm font-medium text-slate-700">Reason (optional)</label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
            />

            <label className="mt-3 block text-sm font-medium text-slate-700">
              Type <span className="font-bold">{selectedBusiness?.name}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={selectedBusiness?.name}
            />

            {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirmName(''); setDeleteReason(''); setDeleteError(''); }}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-[#f4f6f3]"
              >
                Cancel
              </button>
              <button
                onClick={requestDeletion}
                disabled={submitting === 'deletion' || deleteConfirmName !== selectedBusiness?.name}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting === 'deletion' ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
