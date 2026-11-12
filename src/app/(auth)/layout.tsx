import { BrandMark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10 sm:justify-center">
      <div className="mb-6 flex items-center gap-2.5">
        <BrandMark />
        <span className="text-xl font-bold tracking-tight text-slate-900">Haulbook</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
