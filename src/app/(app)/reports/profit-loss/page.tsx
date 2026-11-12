import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { PeriodBar, PrintTitle, ReportHeader } from "@/components/report";
import { Card, Stat } from "@/components/ui";
import { cx, money, num, parseDate, round2 } from "@/lib/format";
import { readPeriod } from "@/lib/period";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Profit & loss" };

export default async function ProfitLossPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const cur = company.currency;
  const period = readPeriod(await searchParams);
  const range = { gte: parseDate(period.from), lte: parseDate(period.to) };

  const [income, costs, expenses] = await Promise.all([
    db.document.aggregate({ where: { kind: "INVOICE", status: { in: ["SENT", "PAID"] }, issueDate: range }, _sum: { subtotal: true }, _count: true }),
    db.bill.aggregate({ where: { status: { not: "VOID" }, issueDate: range }, _sum: { subtotal: true }, _count: true }),
    db.expense.groupBy({ by: ["category"], where: { date: range }, _sum: { amount: true, taxAmount: true } }),
  ]);

  const revenue = num(income._sum.subtotal);
  const cos = num(costs._sum.subtotal);
  const gross = round2(revenue - cos);
  const expenseRows = expenses.map((e) => ({ category: e.category, amount: round2(num(e._sum.amount) - num(e._sum.taxAmount)) })).sort((a, b) => b.amount - a.amount);
  const totalExpenses = round2(expenseRows.reduce((a, e) => a + e.amount, 0));
  const net = round2(gross - totalExpenses);
  const pct = (v: number) => (revenue > 0 ? `${((v / revenue) * 100).toFixed(1)}%` : "—");

  const line = (label: string, value: number, opts: { bold?: boolean; indent?: boolean; tone?: boolean; sub?: string } = {}) => (
    <div className={cx("flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm sm:px-5", opts.bold && "bg-slate-50 font-semibold", opts.indent && "pl-8 sm:pl-10")}>
      <span className={opts.indent ? "text-slate-600" : "text-slate-900"}>{label}{opts.sub && <span className="ml-2 text-xs font-normal text-slate-400">{opts.sub}</span>}</span>
      <span className={cx("tabular whitespace-nowrap", opts.tone && (value < 0 ? "text-red-600" : "text-emerald-600"))}>{money(value, cur)}</span>
    </div>
  );

  return (
    <>
      <ReportHeader title="Profit & loss" subtitle="Based on invoice and bill dates, excluding tax." />
      <PeriodBar path="/reports/profit-loss" period={period} />
      <PrintTitle company={company.name} title="Profit & loss" sub={period.label} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Income" value={money(revenue, cur)} sub={`${income._count} invoice${income._count === 1 ? "" : "s"}`} />
        <Stat label="Subcontractors" value={money(cos, cur)} sub={`${costs._count} bill${costs._count === 1 ? "" : "s"}`} />
        <Stat label="Gross profit" value={money(gross, cur)} sub={`${pct(gross)} margin`} />
        <Stat label="Net profit" value={money(net, cur)} tone={net < 0 ? "red" : "green"} sub={`${pct(net)} of income`} />
      </div>
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {line("Income (invoiced)", revenue)}
        {line("Less: subcontractor costs", -cos)}
        {line("Gross profit", gross, { bold: true, sub: pct(gross) })}
        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5">Operating expenses</div>
        {expenseRows.length === 0 && <div className="px-4 py-2.5 pl-8 text-sm text-slate-400 sm:pl-10">No expenses captured in this period.</div>}
        {expenseRows.map((e) => <div key={e.category}>{line(e.category, -e.amount, { indent: true })}</div>)}
        {line("Total expenses", -totalExpenses)}
        <div className="flex items-baseline justify-between gap-4 bg-slate-900 px-4 py-3.5 text-white sm:px-5">
          <span className="font-semibold">Net profit</span>
          <span className="tabular text-lg font-bold">{money(net, cur)}</span>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-500">Draft and void invoices are left out. Income counts when you send the invoice, not when it is paid.</p>
    </>
  );
}
