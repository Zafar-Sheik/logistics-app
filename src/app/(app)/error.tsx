"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { btn } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><TriangleAlert className="size-7" /></span>
      <h1 className="mt-4 text-lg font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-slate-500">Your data is safe. Check your connection and try again.</p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}
      <button onClick={reset} className={btn({}, "mt-5")}><RefreshCw className="size-4" /> Try again</button>
    </div>
  );
}
