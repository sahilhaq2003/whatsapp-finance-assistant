'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customer.service';

export default function NewCustomerPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

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

      const res = await customerService.createCustomer({
        name: name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        address,
        notes: notes || undefined,
      });

      if (res.success) {
        router.push(`/dashboard/customers/${res.data._id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
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
          href="/dashboard/customers"
          className="text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#17211c]">
          Add Customer
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
            placeholder="e.g. Nimal Perera"
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
              placeholder="e.g. 0771234567"
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
              placeholder="e.g. nimal@example.com"
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
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Postal Code"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
              <div className="flex items-center rounded-2xl border border-slate-100 bg-[#f4f6f3] px-3 py-2 text-sm text-slate-500">
                Sri Lanka (LK)
              </div>
            </div>
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
            placeholder="e.g. Regular customer, prefers bank transfer"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
          <Link
            href="/dashboard/customers"
            className="rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
