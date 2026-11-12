import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The link may be wrong or out of date.</p>
      <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white">Back to Home</Link>
    </div>
  );
}
