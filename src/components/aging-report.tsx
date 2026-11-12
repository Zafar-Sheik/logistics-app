import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { daysBetween, isoDate, money, num, round2, todayISO } from "@/lib/format";
import { PrintTitle, ReportHeader, Table, td, tdr } from "./report";
import { Card, Stat } from "./ui";

const BUCKETS = ["Not due", "1–30 days", "31–60 days", "61–90 days", "90+ days"];
const bucketOf = (daysOverdue: number) => (daysOverdue <= 0 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : daysOverdue <= 90 ? 3 : 4);

/** Aged receivables (customers) or aged payables (subcontractors). */
export async function AgingReport({ side }: { side: "receivables" | "payables" }) {
  const company = await requireCompany();
  const cur = company.currency;
  const today = todayISO();
  const isRec = side === "receivables";

  const items = isRec
    ? (await db.document.findMany({ where: { kind: "INVOICE", status: "SENT" }, include: { customer: { select: { id: true, name: true } } } })).map((d) => ({ contact: d.customer, due: isoDate(d.dueDate), balance: round2(num(d.total) - num(d.amountPaid)) }))
    : (await db.bill.findMany({ where: { status: "OPEN" }, include: { subcontractor: { select: { id: true, name: true } } } })).map((b) => ({ contact: b.subcontractor, due: isoDate(b.dueDate), balance: round2(num(b.total) - num(b.amountPaid)) }));

  const byContact = new Map<string, { id: string; name: string; buckets: number[]; total: number }>();
  const totals = [0, 0, 0, 0, 0];
  for (const it of items) {
    const b = bucketOf(daysBetween(it.due, today));
    const row = byContact.get(it.contact.id) ?? { id: it.contact.id, name: it.contact.name, buckets: [0, 0, 0, 0, 0], total: 0 };
    row.buckets[b] += it.balance;
    row.total += it.balance;
    totals[b] += it.balance;
    byContact.set(it.contact.id, row);
  }
  const rows = [...byContact.values()].sort((a, b) => b.total - a.total);
  const grand = round2(totals.reduce((a, b) => a + b, 0));
  const overdue = round2(grand - totals[0]);
  const title = isRec ? "Who owes you" : "Who you owe";
  const base = isRec ? "/customers" : "/subcontractors";

  return (
    <>
      <ReportHeader title={title} subtitle={isRec ? "Unpaid invoices, grouped by how late they are." : "Unpaid subcontractor bills, grouped by how late they are."} />
      <PrintTitle company={company.name} title={title} sub={`As at ${today}`} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label={isRec ? "Total owed to you" : "Total you owe"} value={money(grand, cur)} />
        <Stat label="Of which overdue" value={money(overdue, cur)} tone={overdue > 0 ? "red" : undefined} />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">{isRec ? "Nobody owes you anything right now." : "You do not owe anyone right now."}</p>
        ) : (
          <Table
            head={[{ label: isRec ? "Customer" : "Subcontractor" }, ...BUCKETS.map((label) => ({ label, right: true })), { label: "Total", right: true }]}
            foot={
              <tr>
                <td className={td}>Total</td>
                {totals.map((t, i) => <td key={i} className={tdr}>{money(t, cur)}</td>)}
                <td className={tdr}>{money(grand, cur)}</td>
              </tr>
            }
          >
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={td}><Link href={`${base}/${r.id}`} className="font-medium text-brand-700">{r.name}</Link></td>
                {r.buckets.map((b, i) => <td key={i} className={`${tdr} ${b > 0 && i > 0 ? "text-red-600" : b === 0 ? "text-slate-300" : ""}`}>{b === 0 ? "–" : money(b, cur)}</td>)}
                <td className={`${tdr} font-semibold`}>{money(r.total, cur)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
