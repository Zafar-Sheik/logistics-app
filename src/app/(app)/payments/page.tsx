import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Banknote, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { SearchBox } from "@/components/search-box";
import { Card, EmptyState, FilterTabs, LinkButton, PageHeader, Pagination, RowList } from "@/components/ui";
import { PAYMENT_METHODS } from "@/lib/domain";
import { fmtDate, money } from "@/lib/format";
import { linker, one, PAGE_SIZE, pageOf, type SearchParams } from "@/lib/params";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const cur = company.currency;
  const sp = await searchParams;
  const q = one(sp.q);
  const filter = one(sp.filter) || "all";
  const page = pageOf(sp.page);
  const href = linker("/payments", { q, filter });

  const where: Prisma.PaymentWhereInput = {
    ...(filter === "in" ? { direction: "IN" } : filter === "out" ? { direction: "OUT" } : {}),
    ...(q ? { OR: [{ reference: { contains: q } }, { contact: { name: { contains: q } } }, { document: { number: { contains: q } } }, { bill: { number: { contains: q } } }] } : {}),
  };
  const [rows, total, anyAtAll] = await Promise.all([
    db.payment.findMany({ where, include: { contact: { select: { name: true } }, document: { select: { id: true, number: true } }, bill: { select: { id: true, number: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.payment.count({ where }),
    db.payment.count(),
  ]);

  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment received and made." actions={anyAtAll > 0 && <LinkButton href="/api/export/payments" variant="secondary" prefetch={false}><Download className="size-4" /> Export</LinkButton>} />
      {anyAtAll === 0 ? (
        <EmptyState icon={<Banknote />} title="No payments yet" text="Payments appear here when you record money received on an invoice, or money paid on a subcontractor bill." action={<LinkButton href="/invoices">Go to invoices</LinkButton>} />
      ) : (
        <>
          <SearchBox placeholder="Search name, reference, invoice no.…" />
          <FilterTabs active={filter} hrefFor={(k) => href({ filter: k === "all" ? null : k, page: null })} tabs={[{ key: "all", label: "All" }, { key: "in", label: "Money in" }, { key: "out", label: "Money out" }]} />
          {rows.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-slate-500">Nothing in this view.</Card>
          ) : (
            <RowList>
              {rows.map((p) => {
                const isIn = p.direction === "IN";
                const target = p.document ? { href: `/invoices/${p.document.id}`, label: p.document.number } : p.bill ? { href: `/bills/${p.bill.id}`, label: `Bill ${p.bill.number}` } : null;
                return (
                  <Link key={p.id} href={target?.href ?? "/payments"} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${isIn ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                      {isIn ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{p.contact.name}</span>
                      <span className="block truncate text-xs text-slate-500">{fmtDate(p.date)} · {target?.label} · {PAYMENT_METHODS[p.method]}{p.reference ? ` · ${p.reference}` : ""}</span>
                    </span>
                    <span className={`tabular shrink-0 text-sm font-semibold ${isIn ? "text-emerald-600" : "text-slate-900"}`}>{isIn ? "+" : "−"} {money(p.amount, cur)}</span>
                  </Link>
                );
              })}
            </RowList>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
