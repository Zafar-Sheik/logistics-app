import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock, Download, Hourglass, Package, Percent, TrendingUp } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { href: "/reports/profit-loss", icon: TrendingUp, title: "Profit & loss", text: "Income, subcontractor costs and expenses. What you really made." },
  { href: "/reports/loads", icon: Package, title: "Load profitability", text: "Margin on every load and which customers earn you the most." },
  { href: "/reports/receivables", icon: Clock, title: "Who owes you", text: "Unpaid invoices by customer and how overdue they are." },
  { href: "/reports/payables", icon: Hourglass, title: "Who you owe", text: "Unpaid subcontractor bills and when they fall due." },
  { href: "/reports/tax", icon: Percent, title: "VAT / tax report", text: "Tax charged and tax paid for your return." },
];

const EXPORTS = [
  ["invoices", "Invoices"],
  ["bills", "Subcontractor bills"],
  ["payments", "Payments"],
  ["expenses", "Expenses"],
  ["loads", "Loads"],
  ["contacts", "Customers & subcontractors"],
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="See how the business is doing." />
      <div className="grid gap-3 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:bg-slate-50">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><r.icon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-slate-900">{r.title}</span>
              <span className="block text-sm text-slate-500">{r.text}</span>
            </span>
            <ChevronRight className="size-4 text-slate-300" />
          </Link>
        ))}
      </div>
      <Card className="mt-5 p-4 sm:p-5">
        <h2 className="text-[15px] font-semibold text-slate-900">Export your data</h2>
        <p className="mt-0.5 text-sm text-slate-500">Download spreadsheets (CSV) for your accountant or your own records. Opens in Excel and Google Sheets.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXPORTS.map(([key, label]) => (
            <a key={key} href={`/api/export/${key}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Download className="size-4" /> {label}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}
