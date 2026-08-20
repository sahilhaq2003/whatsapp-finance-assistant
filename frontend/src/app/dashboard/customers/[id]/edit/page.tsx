'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customer.service';

export default function EditCustomerPage() {
  const {
    selectedBusiness,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedBusiness || !customerId) return;
    setLoading(true);
    customerService
      .getCustomer(customerId)
      .then((res) => {
        if (res.success) {
          const c = res.data;
          setName(c.name);
          setPhone(c.phone || '');
          setEmail(c.email || '');
          setAddressLine1(c.address?.line1 || '');
          setAddressLine2(c.address?.line2 || '');
          setCity(c.address?.city || '');
          setDistrict(c.address?.district || '');
          setPostalCode(c.address?.postalCode || '');
          setNotes(c.notes || '');
        } else {
          router.push('/dashboard/customers');
        }
      })
      .catch(() => router.push('/dashboard/customers'))
      .finally(() => setLoading(false));
  }, [selectedBusiness, customerId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const address =
        addressLine1 || city || district
          ? {
              line1: addressLine1 || undefined,
              line2: addressLine2 || undefined,
              city: city || undefined,
              district: district || undefined,
              postalCode: postalCode || undefined,
              country: 'LK',
            }
          : undefined;

      const res = await customerService.updateCustomer(customerId, {
        name: name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        address,
        notes: notes || undefined,
      });

      if (res.success) {
        router.push(`/dashboard/customers/${customerId}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSaving(false);
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/customers/${customerId}`}
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Customer
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">
          Edit Customer
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
      >
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Customer Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            required
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Address</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Address Line 1"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Address Line 2"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal Code"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Customer'}
          </button>
          <Link
            href={`/dashboard/customers/${customerId}`}
            className="rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
