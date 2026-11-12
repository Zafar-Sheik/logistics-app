import Link from "next/link";
import type { ReactNode } from "react";
import { presets, type Period } from "@/lib/period";
import { cx } from "@/lib/format";
import { inputClass } from "./form";
import { PrintButton } from "./share-document";
import { btn, LinkButton, PageHeader } from "./ui";
import { Download } from "lucide-react";

export function ReportHeader({ title, subtitle, exportHref }: { title: string; subtitle?: string; exportHref?: string }) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={{ href: "/reports", label: "Reports" }}
        actions={
          <>
            {exportHref && <LinkButton href={exportHref} variant="secondary" prefetch={false}><Download className="size-4" /> Export</LinkButton>}
            <PrintButton />
          </>
        }
      />
    </>
  );
}

/** Title block that only shows on paper. */
export function PrintTitle({ company, title, sub }: { company: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 hidden print:block">
      <div className="text-sm text-slate-500">{company}</div>
      <div className="text-2xl font-bold">{title}</div>
      {sub && <div className="text-sm text-slate-600">{sub}</div>}
    </div>
  );
}

export function PeriodBar({ path, period }: { path: string; period: Period }) {
  return (
    <div className="no-print mb-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {presets().map((p) => (
          <Link key={p.key} href={`${path}?period=${p.key}`} scroll={false} className={cx("inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium", period.key === p.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100")}>
            {p.label}
          </Link>
        ))}
      </div>
      <form action={path} className="mt-1 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-medium text-slate-500 sm:flex-none">
          From
          <input type="date" name="from" defaultValue={period.from} className={cx(inputClass, "mt-1")} />
        </label>
        <label className="min-w-0 flex-1 text-xs font-medium text-slate-500 sm:flex-none">
          To
          <input type="date" name="to" defaultValue={period.to} className={cx(inputClass, "mt-1")} />
        </label>
        <button className={btn({ variant: "secondary" })}>Apply</button>
      </form>
    </div>
  );
}

/** Simple responsive table: scrolls sideways on phones rather than squashing numbers. */
export function Table({ head, children, foot }: { head: { label: string; right?: boolean }[]; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {head.map((h) => <th key={h.label} className={cx("px-4 py-2.5 whitespace-nowrap", h.right && "text-right")}>{h.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
        {foot && <tfoot className="border-t-2 border-slate-200 font-semibold">{foot}</tfoot>}
      </table>
    </div>
  );
}

export const td = "px-4 py-2.5 align-top";
export const tdr = "px-4 py-2.5 align-top text-right tabular whitespace-nowrap";
