import type { Metadata } from "next";
import { Package, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { SearchBox } from "@/components/search-box";
import { Badge, Card, EmptyState, FilterTabs, LinkButton, PageHeader, Pagination, Row, RowList } from "@/components/ui";
import { LOAD_STATUS } from "@/lib/domain";
import { fmtDate, money, num } from "@/lib/format";
import { linker, one, PAGE_SIZE, pageOf, type SearchParams } from "@/lib/params";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Loads" };

const NOT_INVOICED: Prisma.LoadWhereInput = { lines: { none: { document: { kind: "INVOICE", status: { not: "VOID" } } } } };

export default async function LoadsPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const sp = await searchParams;
  const q = one(sp.q);
  const filter = one(sp.filter) || "all";
  const page = pageOf(sp.page);
  const href = linker("/loads", { q, filter });

  const filters: Record<string, Prisma.LoadWhereInput> = {
    all: {},
    active: { status: { in: ["PLANNED", "IN_TRANSIT"] } },
    delivered: { status: "DELIVERED" },
    "to-invoice": { status: "DELIVERED", ...NOT_INVOICED },
    "no-pod": { status: "DELIVERED", podReceived: false },
    "no-bill": { status: "DELIVERED", subcontractorId: { not: null }, bills: { none: { status: { not: "VOID" } } } },
    cancelled: { status: "CANCELLED" },
  };
  const search: Prisma.LoadWhereInput = q
    ? {
        OR: [
          { number: { contains: q } },
          { origin: { contains: q } },
          { destination: { contains: q } },
          { customerRef: { contains: q } },
          { vehicleReg: { contains: q } },
          { customer: { name: { contains: q } } },
          { subcontractor: { name: { contains: q } } },
        ],
      }
    : {};
  const where = { AND: [filters[filter] ?? {}, search] };

  const [rows, total, anyAtAll, toInvoice, active] = await Promise.all([
    db.load.findMany({
      where,
      include: { customer: { select: { name: true } }, subcontractor: { select: { name: true } } },
      orderBy: [{ pickupDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.load.count({ where }),
    db.load.count(),
    db.load.count({ where: filters["to-invoice"] }),
    db.load.count({ where: filters.active }),
  ]);

  return (
    <>
      <PageHeader
        title="Loads"
        subtitle="Every job you move, from booking to delivery."
        actions={<LinkButton href="/loads/new"><Plus className="size-4" /> New load</LinkButton>}
      />
      {anyAtAll === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Book your first load"
          text="A load is one job: who it is for, who is carrying it, the route and the rates. Everything else (invoice, payment, paying the subcontractor) flows from here."
          action={<LinkButton href="/loads/new"><Plus className="size-4" /> New load</LinkButton>}
        />
      ) : (
        <>
          <SearchBox placeholder="Search load no., place, customer, truck…" />
          <FilterTabs
            active={filter}
            hrefFor={(k) => href({ filter: k === "all" ? null : k, page: null })}
            tabs={[
              { key: "all", label: "All" },
              { key: "active", label: "Active", count: active },
              { key: "to-invoice", label: "To invoice", count: toInvoice },
              { key: "delivered", label: "Delivered" },
              { key: "no-pod", label: "POD missing" },
              { key: "no-bill", label: "Awaiting sub bill" },
              { key: "cancelled", label: "Cancelled" },
            ]}
          />
          {rows.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-slate-500">No loads match this view.</Card>
          ) : (
            <RowList>
              {rows.map((l) => (
                <Row
                  key={l.id}
                  href={`/loads/${l.id}`}
                  title={`${l.origin} → ${l.destination}`}
                  subtitle={`${l.number} · ${l.customer.name}`}
                  meta={
                    <>
                      <Badge tone={LOAD_STATUS[l.status].tone}>{LOAD_STATUS[l.status].label}</Badge>
                      <span className="text-xs text-slate-500">{fmtDate(l.pickupDate)}{l.subcontractor ? ` · ${l.subcontractor.name}` : ""}</span>
                    </>
                  }
                  right={money(l.customerRate, company.currency)}
                  rightSub={num(l.subRate) > 0 ? `margin ${money(num(l.customerRate) - num(l.subRate), company.currency)}` : undefined}
                />
              ))}
            </RowList>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
