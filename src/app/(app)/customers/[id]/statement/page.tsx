import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { PeriodBar, Table, td, tdr } from "@/components/report";
import { PrintButton } from "@/components/share-document";
import { PageHeader } from "@/components/ui";
import { fmtDate, isoDate, money, num, parseDate, round2, todayISO } from "@/lib/format";
import { readPeriod } from "@/lib/period";
import type { SearchParams } from "@/lib/params";

export default async function StatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const company = await requireCompany();
  const cur = company.currency;
  const customer = await db.contact.findFirst({ where: { id, kind: "CUSTOMER" } });
  if (!customer) notFound();
  const period = readPeriod(await searchParams, "last-3");
  const from = parseDate(period.from);
  const to = parseDate(period.to);

  const live = { kind: "INVOICE" as const, customerId: id, status: { in: ["SENT" as const, "PAID" as const] } };
  const [openInv, openPay, invoices, payments] = await Promise.all([
    db.document.aggregate({ where: { ...live, issueDate: { lt: from } }, _sum: { total: true } }),
    db.payment.aggregate({ where: { direction: "IN", contactId: id, date: { lt: from } }, _sum: { amount: true } }),
    db.document.findMany({ where: { ...live, issueDate: { gte: from, lte: to } } }),
    db.payment.findMany({ where: { direction: "IN", contactId: id, date: { gte: from, lte: to } }, include: { document: { select: { number: true } } } }),
  ]);

  const opening = round2(num(openInv._sum.total) - num(openPay._sum.amount));
  const entries = [
    ...invoices.map((d) => ({ date: isoDate(d.issueDate), sort: 0, text: `Invoice ${d.number}`, ref: d.reference ?? "", debit: num(d.total), credit: 0 })),
    ...payments.map((p) => ({ date: isoDate(p.date), sort: 1, text: `Payment received${p.document ? ` (${p.document.number})` : ""}`, ref: p.reference ?? "", debit: 0, credit: num(p.amount) })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.sort - b.sort);
  const rows: ((typeof entries)[number] & { balance: number })[] = [];
  for (const e of entries) rows.push({ ...e, balance: round2((rows.at(-1)?.balance ?? opening) + e.debit - e.credit) });
  const closing = rows.at(-1)?.balance ?? opening;
  const address = [company.addressLine1, company.addressLine2, [company.city, company.postalCode].filter(Boolean).join(", ")].filter(Boolean);

  return (
    <>
      <PageHeader title="Statement" subtitle={customer.name} back={{ href: `/customers/${id}`, label: customer.name }} actions={<PrintButton />} />
      <PeriodBar path={`/customers/${id}/statement`} period={period} />
      <article className="print-plain overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card" style={{ ["--accent" as string]: company.accentColor }}>
        <div className="h-2 bg-[var(--accent)]" />
        <div className="p-5 sm:p-10">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {company.logo ? <img src={company.logo} alt={company.name} className="max-h-20 max-w-[200px] object-contain" /> : <div className="text-2xl font-bold">{company.tradingName || company.name}</div>}
              <div className="mt-2 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{company.name}</div>
                {address.map((l) => <div key={l}>{l}</div>)}
                {company.phone && <div>{company.phone}</div>}
                {company.email && <div>{company.email}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold uppercase tracking-wide text-[var(--accent)]">Statement</div>
              <div className="mt-1 text-sm text-slate-600">{fmtDate(period.from)} – {fmtDate(period.to)}</div>
              <div className="text-sm text-slate-500">Printed {fmtDate(todayISO())}</div>
            </div>
          </header>
          <div className="mt-6 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">To</div>
            <div className="font-semibold">{customer.name}</div>
            {customer.address && <div className="whitespace-pre-line text-slate-600">{customer.address}</div>}
          </div>
          <div className="mt-6 -mx-4 sm:mx-0">
            <Table
              head={[{ label: "Date" }, { label: "Details" }, { label: "Invoiced", right: true }, { label: "Paid", right: true }, { label: "Balance", right: true }]}
              foot={<tr><td className={td} colSpan={4}>Amount due</td><td className={tdr}>{money(closing, cur)}</td></tr>}
            >
              <tr className="text-slate-500"><td className={td}>{fmtDate(period.from)}</td><td className={td}>Opening balance</td><td className={tdr} /><td className={tdr} /><td className={tdr}>{money(opening, cur)}</td></tr>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(r.date)}</td>
                  <td className={td}>{r.text}{r.ref && <span className="block text-xs text-slate-500">{r.ref}</span>}</td>
                  <td className={tdr}>{r.debit ? money(r.debit, cur) : ""}</td>
                  <td className={tdr}>{r.credit ? money(r.credit, cur) : ""}</td>
                  <td className={tdr}>{money(r.balance, cur)}</td>
                </tr>
              ))}
            </Table>
          </div>
          {company.bankAccountNumber && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm print:border print:border-slate-200">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Banking details</div>
              <div className="mt-1 text-slate-700">
                {[company.bankName, company.bankAccountName || company.name, `Acc ${company.bankAccountNumber}`, company.bankBranchCode && `Branch ${company.bankBranchCode}`, company.bankAccountType].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
