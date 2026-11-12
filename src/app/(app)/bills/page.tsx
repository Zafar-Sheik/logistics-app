import type { Metadata } from "next";
import { Plus, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { SearchBox } from "@/components/search-box";
import { Badge, Card, EmptyState, FilterTabs, LinkButton, PageHeader, Pagination, Row, RowList, Stat } from "@/components/ui";
import { billStatus } from "@/lib/domain";
import { fmtDate, money, num, parseDate, round2, todayISO } from "@/lib/format";
import { linker, one, PAGE_SIZE, pageOf, type SearchParams } from "@/lib/params";
import { Prisma } from "@/generated/prisma/client";
import { likeTerm } from "@/lib/lookups";

export const metadata: Metadata = { title: "Subcontractor bills" };

/** Open bills whose load has been paid for by the customer. */
const READY: Prisma.BillWhereInput = { status: "OPEN", load: { lines: { some: { document: { kind: "INVOICE", status: "PAID" } } } } };

export default async function BillsPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const cur = company.currency;
  const sp = await searchParams;
  const q = one(sp.q);
  const filter = one(sp.filter) || "all";
  const page = pageOf(sp.page);
  const href = linker("/bills", { q, filter });
  const today = todayISO();

  const filters: Record<string, Prisma.BillWhereInput> = {
    all: {},
    open: { status: "OPEN" },
    ready: READY,
    overdue: { status: "OPEN", dueDate: { lt: parseDate(today) } },
    paid: { status: "PAID" },
    void: { status: "VOID" },
  };
  const search: Prisma.BillWhereInput = q ? { OR: [{ number: { contains: q } }, { subcontractor: { name: { contains: q } } }, { load: { number: { contains: q } } }] } : {};
  const where = { AND: [filters[filter] ?? {}, search] };

  // The page of rows is one joined query (subcontractor name, load number and
  // whether the customer has paid), so the list costs a single round trip.
  const customerPaid = Prisma.sql`EXISTS (SELECT 1 FROM DocumentLine dl JOIN Document d ON d.id = dl.documentId WHERE dl.loadId = b.loadId AND d.kind = 'INVOICE' AND d.status = 'PAID')`;
  const sqlFilters: Record<string, Prisma.Sql> = {
    all: Prisma.sql`TRUE`,
    open: Prisma.sql`b.status = 'OPEN'`,
    ready: Prisma.sql`b.status = 'OPEN' AND ${customerPaid}`,
    overdue: Prisma.sql`b.status = 'OPEN' AND b.dueDate < ${parseDate(today)}`,
    paid: Prisma.sql`b.status = 'PAID'`,
    void: Prisma.sql`b.status = 'VOID'`,
  };
  const like = likeTerm(q);
  const sqlSearch = q ? Prisma.sql`(b.number LIKE ${like} OR c.name LIKE ${like} OR l.number LIKE ${like})` : Prisma.sql`TRUE`;
  type BillRow = { id: string; number: string; status: string; dueDate: Date; total: unknown; amountPaid: unknown; subName: string; loadNumber: string | null; customerPaid: unknown };

  const [rows, total, anyAtAll, open, ready] = await Promise.all([
    db.$queryRaw<BillRow[]>`
      SELECT b.id, b.number, b.status, b.dueDate, b.total, b.amountPaid, c.name AS subName, l.number AS loadNumber, ${customerPaid} AS customerPaid
      FROM Bill b
      JOIN Contact c ON c.id = b.subcontractorId
      LEFT JOIN \`Load\` l ON l.id = b.loadId
      WHERE (${sqlFilters[filter] ?? sqlFilters.all}) AND ${sqlSearch}
      ORDER BY FIELD(b.status, 'OPEN', 'PAID', 'VOID'), b.dueDate ASC, b.id
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    db.bill.count({ where }),
    db.bill.count(),
    db.bill.aggregate({ where: { status: "OPEN" }, _sum: { total: true, amountPaid: true }, _count: true }),
    db.bill.aggregate({ where: READY, _sum: { total: true, amountPaid: true }, _count: true }),
  ]);

  return (
    <>
      <PageHeader title="Subcontractor bills" subtitle="Invoices trucking companies have sent you." actions={<LinkButton href="/bills/new"><Plus className="size-4" /> New bill</LinkButton>} />
      {anyAtAll === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="No bills yet"
          text="When a subcontractor sends you their invoice for a load, capture it here. Haulbook tracks what you owe and tells you when your customer has paid, so you know it is safe to pay."
          action={<LinkButton href="/bills/new"><Plus className="size-4" /> New bill</LinkButton>}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat label="You owe" value={money(num(open._sum.total) - num(open._sum.amountPaid), cur)} sub={`${open._count} unpaid bill${open._count === 1 ? "" : "s"}`} />
            <Stat label="Ready to pay" value={money(num(ready._sum.total) - num(ready._sum.amountPaid), cur)} tone={ready._count > 0 ? "green" : undefined} sub="Customer has paid you" />
          </div>
          <SearchBox placeholder="Search bill no., subcontractor, load…" />
          <FilterTabs
            active={filter}
            hrefFor={(k) => href({ filter: k === "all" ? null : k, page: null })}
            tabs={[
              { key: "all", label: "All" },
              { key: "open", label: "To pay", count: open._count },
              { key: "ready", label: "Ready to pay", count: ready._count },
              { key: "overdue", label: "Overdue" },
              { key: "paid", label: "Paid" },
              { key: "void", label: "Void" },
            ]}
          />
          {rows.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-slate-500">Nothing in this view.</Card>
          ) : (
            <RowList>
              {rows.map((b) => {
                const s = billStatus(b, today);
                const isReady = b.status === "OPEN" && num(b.customerPaid) > 0;
                return (
                  <Row
                    key={b.id}
                    href={`/bills/${b.id}`}
                    title={b.subName}
                    subtitle={`${b.number}${b.loadNumber ? ` · ${b.loadNumber}` : ""} · due ${fmtDate(b.dueDate)}`}
                    meta={<><Badge tone={s.tone}>{s.label}</Badge>{isReady && <Badge tone="green">Customer paid</Badge>}</>}
                    right={money(b.total, cur)}
                    rightSub={b.status === "OPEN" && num(b.amountPaid) > 0 ? `${money(round2(num(b.total) - num(b.amountPaid)), cur)} left` : undefined}
                  />
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
