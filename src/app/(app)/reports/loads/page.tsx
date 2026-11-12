import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getContactNames, nameOf } from "@/lib/lookups";
import { requireCompany } from "@/lib/auth";
import { PeriodBar, PrintTitle, ReportHeader, Table, td, tdr } from "@/components/report";
import { Card, CardHeader, Stat } from "@/components/ui";
import { fmtDate, money, num, parseDate, round2 } from "@/lib/format";
import { readPeriod } from "@/lib/period";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Load profitability" };

export default async function LoadsReportPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const cur = company.currency;
  const period = readPeriod(await searchParams);
  const [rawLoads, names] = await Promise.all([
    db.load.findMany({
      where: { status: { not: "CANCELLED" }, pickupDate: { gte: parseDate(period.from), lte: parseDate(period.to) } },
      orderBy: { pickupDate: "desc" },
      take: 1000,
    }),
    getContactNames(),
  ]);
  const loads = rawLoads.map((l) => ({
    ...l,
    customer: { id: l.customerId, name: nameOf(names, l.customerId) },
    subcontractor: l.subcontractorId ? { name: nameOf(names, l.subcontractorId) } : null,
  }));

  const revenue = round2(loads.reduce((a, l) => a + num(l.customerRate), 0));
  const cost = round2(loads.reduce((a, l) => a + num(l.subRate), 0));
  const margin = round2(revenue - cost);
  const pct = (m: number, r: number) => (r > 0 ? `${((m / r) * 100).toFixed(1)}%` : "—");

  const byCustomer = new Map<string, { id: string; name: string; loads: number; revenue: number; margin: number }>();
  for (const l of loads) {
    const row = byCustomer.get(l.customer.id) ?? { id: l.customer.id, name: l.customer.name, loads: 0, revenue: 0, margin: 0 };
    row.loads += 1;
    row.revenue += num(l.customerRate);
    row.margin += num(l.customerRate) - num(l.subRate);
    byCustomer.set(l.customer.id, row);
  }
  const customers = [...byCustomer.values()].sort((a, b) => b.margin - a.margin);

  return (
    <>
      <ReportHeader title="Load profitability" subtitle="Based on the rates on each load, by pickup date, excluding tax." exportHref={`/api/export/loads?from=${period.from}&to=${period.to}`} />
      <PeriodBar path="/reports/loads" period={period} />
      <PrintTitle company={company.name} title="Load profitability" sub={period.label} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Loads" value={loads.length} />
        <Stat label="Charged" value={money(revenue, cur)} />
        <Stat label="Paid out" value={money(cost, cur)} />
        <Stat label="Margin" value={money(margin, cur)} tone={margin < 0 ? "red" : "green"} sub={pct(margin, revenue)} />
      </div>
      {loads.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-slate-500">No loads in this period.</Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="By customer" />
            <Table head={[{ label: "Customer" }, { label: "Loads", right: true }, { label: "Charged", right: true }, { label: "Margin", right: true }, { label: "%", right: true }]}>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className={td}><Link href={`/customers/${c.id}`} className="font-medium text-brand-700">{c.name}</Link></td>
                  <td className={tdr}>{c.loads}</td>
                  <td className={tdr}>{money(c.revenue, cur)}</td>
                  <td className={`${tdr} font-semibold ${c.margin < 0 ? "text-red-600" : ""}`}>{money(c.margin, cur)}</td>
                  <td className={tdr}>{pct(c.margin, c.revenue)}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Every load" />
            <Table
              head={[{ label: "Load" }, { label: "Date" }, { label: "Customer / subcontractor" }, { label: "Charged", right: true }, { label: "Paid out", right: true }, { label: "Margin", right: true }]}
              foot={<tr><td className={td} colSpan={3}>Total</td><td className={tdr}>{money(revenue, cur)}</td><td className={tdr}>{money(cost, cur)}</td><td className={tdr}>{money(margin, cur)}</td></tr>}
            >
              {loads.map((l) => {
                const m = num(l.customerRate) - num(l.subRate);
                return (
                  <tr key={l.id}>
                    <td className={td}><Link href={`/loads/${l.id}`} className="font-medium text-brand-700">{l.number}</Link><div className="text-xs text-slate-500">{l.origin} → {l.destination}</div></td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(l.pickupDate)}</td>
                    <td className={td}>{l.customer.name}<div className="text-xs text-slate-500">{l.subcontractor?.name ?? "Own truck"}</div></td>
                    <td className={tdr}>{money(l.customerRate, cur)}</td>
                    <td className={tdr}>{money(l.subRate, cur)}</td>
                    <td className={`${tdr} font-semibold ${m < 0 ? "text-red-600" : ""}`}>{money(m, cur)}</td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
