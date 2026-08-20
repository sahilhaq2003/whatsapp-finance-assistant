import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f3]">
      <div className="max-w-md rounded-[1.5rem] bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)] text-center">
        <h2 className="text-6xl font-bold text-slate-300">404</h2>
        <h3 className="mt-2 text-xl font-bold text-[#17211c]">Page Not Found</h3>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
