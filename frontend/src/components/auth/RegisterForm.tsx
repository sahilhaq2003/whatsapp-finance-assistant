'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterForm() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: 'retail',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!form.businessName.trim()) {
      setError('Business name is required');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email,
        phone: form.phone,
        password: form.password,
        businessName: form.businessName.trim(),
        businessType: form.businessType,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-semibold text-slate-700"
          >
            First Name *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={handleChange}
            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-semibold text-slate-700"
          >
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={form.lastName}
            onChange={handleChange}
            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-700"
        >
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-semibold text-slate-700"
        >
          Phone *
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          value={form.phone}
          onChange={handleChange}
          placeholder="+94771234567"
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
      <div>
        <label
          htmlFor="businessName"
          className="block text-sm font-semibold text-slate-700"
        >
          Business Name *
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          value={form.businessName}
          onChange={handleChange}
          placeholder="e.g. Sahil Fashion Store"
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
      <div>
        <label
          htmlFor="businessType"
          className="block text-sm font-semibold text-slate-700"
        >
          Business Type
        </label>
        <select
          id="businessType"
          name="businessType"
          value={form.businessType}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, businessType: e.target.value }))
          }
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        >
          <option value="retail">Retail</option>
          <option value="freelancer">Freelancer</option>
          <option value="service">Service</option>
          <option value="home_business">Home Business</option>
          <option value="tutor">Tutor</option>
          <option value="photography">Photography</option>
          <option value="beauty">Beauty</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-slate-700"
        >
          Password *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          minLength={8}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-semibold text-slate-700"
        >
          Confirm Password *
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          value={form.confirmPassword}
          onChange={handleChange}
          minLength={8}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
      {error && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Creating workspace...' : 'Create Account'}
      </button>
    </form>
  );
}
