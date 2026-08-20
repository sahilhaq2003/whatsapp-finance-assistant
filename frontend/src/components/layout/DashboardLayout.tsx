'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navGroups = [
  {
    label: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', active: '/dashboard', mark: 'D' },
      { href: '/dashboard/transactions', label: 'Transactions', active: '/dashboard/transactions', mark: 'T' },
      { href: '/dashboard/invoices', label: 'Invoices', active: '/dashboard/invoices', mark: 'I' },
      { href: '/dashboard/customers', label: 'Customers', active: '/dashboard/customers', mark: 'C' },
      { href: '/dashboard/assistant', label: 'Assistant', active: '/dashboard/assistant', mark: 'A' },
    ],
  },
  {
    label: 'Finance Tools',
    items: [
      { href: '/dashboard/reports', label: 'Reports', active: '/dashboard/reports', mark: 'R' },
      { href: '/dashboard/summaries', label: 'Summaries', active: '/dashboard/summaries', mark: 'S' },
      { href: '/dashboard/ai-proposals', label: 'AI Proposals', active: '/dashboard/ai-proposals', mark: 'P' },
      { href: '/dashboard/settings/reminders', label: 'Reminders', active: '/dashboard/settings/reminders', mark: 'M' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/settings/whatsapp', label: 'WhatsApp Settings', active: '/dashboard/settings/whatsapp', mark: 'W' },
      { href: '/dashboard/settings/privacy', label: 'Privacy', active: '/dashboard/settings/privacy', mark: 'P' },
    ],
  },
];

const mobileNavItems = navGroups.flatMap((group) => group.items);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, selectedBusiness, businesses, selectBusiness, logout } =
    useAuth();

  return (
    <div className="min-h-screen bg-[#dce8e4] p-3 text-[#101816] sm:p-5 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[1.35rem] bg-[#fbfcfb] shadow-[0_24px_80px_rgba(15,40,32,0.14)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-[250px] shrink-0 bg-[#0d4336] px-5 py-5 text-white lg:flex lg:flex-col">
          <Link href="/dashboard" className="flex items-center justify-center">
            <span className="text-2xl font-extrabold tracking-tight text-white">Salligo</span>
          </Link>

          <div className="mt-7 rounded-xl border border-white/10 bg-white/10 p-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-[#0a392f] px-3 py-2">
              <span className="text-sm text-emerald-100">Search</span>
              <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-xs text-emerald-100">
                Ctrl F
              </span>
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-bold text-white/80">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.active);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? 'bg-white/14 text-emerald-100 shadow-[inset_3px_0_0_#39e6bd]'
                            : 'text-emerald-50/75 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs ${
                            isActive
                              ? 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100'
                              : 'border-white/10 bg-white/5 text-emerald-50/60'
                          }`}
                        >
                          {item.mark}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 pt-4">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs font-semibold text-emerald-100/70">
                Workspace
              </p>
              <p className="mt-1 truncate text-sm font-bold">
                {selectedBusiness?.name || 'Business finance'}
              </p>
              <p className="mt-1 text-xs text-emerald-100/65">
                {selectedBusiness?.baseCurrency || 'LKR'} base currency
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/15"
            >
              <span>{user?.firstName || 'Account'}</span>
              <span>Exit</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight text-[#101816]">
                  Dashboard
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  Welcome back {user?.firstName || 'there'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {businesses.length > 1 && (
                  <select
                    value={selectedBusiness?._id || ''}
                    onChange={(e) => {
                      const found = businesses.find(
                        (b) => b._id === e.target.value,
                      );
                      if (found) selectBusiness(found);
                    }}
                    className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-none outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:block"
                  >
                    {businesses.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                <Link
                  href="/dashboard/transactions/new"
                  className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700 sm:inline-flex"
                >
                  Add transaction
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="rounded-xl bg-[#0d4336] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(13,67,54,0.18)] hover:bg-[#0a392f]"
                >
                  Export
                </Link>
              </div>
            </div>
            <div className="border-t border-slate-100 px-4 py-3 lg:hidden">
              <nav className="flex gap-2 overflow-x-auto">
                {mobileNavItems.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.active);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${
                        isActive
                          ? 'bg-[#0d4336] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden bg-[#fbfcfb] p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
