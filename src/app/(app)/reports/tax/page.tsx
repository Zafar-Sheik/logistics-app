import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { PeriodBar, PrintTitle, ReportHeader } from "@/components/report";
import { Alert, Card } from "@/components/ui";
import { money, num, parseDate, round2 } from "@/lib/format";
import { readPeriod } from "@/lib/period";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Tax report" };

export default async function TaxPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const cur = company.currency;
  const tax = company.taxLabel;
  const period = readPeriod(await searchParams, "last-month");
  const range = { gte: parseDate(period.from), lte: parseDate(period.to) };

  const [sales, bills, expenses] = await Promise.all([
    db.document.aggregate({ where: { kind: "INVOICE", status: { in: ["SENT", "PAID"] }, issueDate: range }, _sum: { subtotal: true, taxTotal: true }, _count: true }),
    db.bill.aggregate({ where: { status: { not: "VOID" }, issueDate: range }, _sum: { subtotal: true, taxTotal: true }, _count: true }),
    db.expense.aggregate({ where: { date: range, taxAmount: { gt: 0 } }, _sum: { amount: true, taxAmount: true }, _count: true }),
  ]);

  const output = num(sales._sum.taxTotal);
  const inputBills = num(bills._sum.taxTotal);
  const inputExp = num(expenses._sum.taxAmount);
  const input = round2(inputBills + inputExp);
  const net = round2(output - input);

  const row = (label: string, base: number | null, amount: number, sub?: string) => (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 px-4 py-2.5 text-sm sm:px-5">
      <span>{label}{sub && <span className="block text-xs text-slate-400">{sub}</span>}</span>
      <span className="tabular hidden w-32 text-right text-slate-500 sm:block">{base == null ? "" : money(base, cur)}</span>
      <span className="tabular w-28 text-right font-medium">{money(amount, cur)}</span>
    </div>
  );

  return (
    <>
      <ReportHeader title={`${tax} report`} subtitle={`${tax} charged on invoices and paid on bills and expenses.`} />
      {!company.taxRegistered && <div className="mb-4"><Alert tone="amber">Your company is set as not {tax} registered, so no tax is added to invoices. You can change this under Settings → Invoice settings.</Alert></div>}
      <PeriodBar path="/reports/tax" period={period} />
      <PrintTitle company={company.name} title={`${tax} report`} sub={period.label} />
      <Card className="divide-y divide-slate-100 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5">
          <span>{tax} you charged (output)</span><span className="hidden w-32 text-right sm:block">Excl. amount</span><span className="w-28 text-right">{tax}</span>
        </div>
        {row("Sales invoices", num(sales._sum.subtotal), output, `${sales._count} invoice${sales._count === 1 ? "" : "s"}`)}
        <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5">{tax} you paid (input)</div>
        {row("Subcontractor bills", num(bills._sum.subtotal), inputBills, `${bills._count} bill${bills._count === 1 ? "" : "s"}`)}
        {row("Expenses", round2(num(expenses._sum.amount) - inputExp), inputExp, `${expenses._count} expense${expenses._count === 1 ? "" : "s"} with ${tax}`)}
        {row(`Total ${tax} paid`, null, input)}
        <div className="flex items-baseline justify-between gap-4 bg-slate-900 px-4 py-3.5 text-white sm:px-5">
          <span className="font-semibold">{net >= 0 ? `${tax} payable to the revenue service` : `${tax} refund due to you`}</span>
          <span className="tabular text-lg font-bold">{money(Math.abs(net), cur)}</span>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-500">Worked out on the invoice basis (by document date). Use this as a guide for your return and confirm with your accountant.</p>
    </>
  );
}
