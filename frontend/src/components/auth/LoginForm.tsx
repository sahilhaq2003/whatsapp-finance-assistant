'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="finance@company.com"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-slate-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="Min. 8 characters"
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
        className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
