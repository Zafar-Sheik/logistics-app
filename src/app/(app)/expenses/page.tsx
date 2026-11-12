import type { Metadata } from "next";
import { Download, HandCoins, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { SearchBox } from "@/components/search-box";
import { Card, EmptyState, LinkButton, PageHeader, Pagination, Row, RowList, Stat } from "@/components/ui";
import { endOfMonth, fmtDate, money, num, parseDate, startOfMonth, todayISO } from "@/lib/format";
import { linker, one, PAGE_SIZE, pageOf, type SearchParams } from "@/lib/params";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const company = await requireCompany();
  const cur = company.currency;
  const sp = await searchParams;
  const q = one(sp.q);
  const page = pageOf(sp.page);
  const href = linker("/expenses", { q });
  const today = todayISO();

  const where: Prisma.ExpenseWhereInput = q ? { OR: [{ category: { contains: q } }, { vendor: { contains: q } }, { description: { contains: q } }, { reference: { contains: q } }] } : {};
  const [rows, total, anyAtAll, month] = await Promise.all([
    db.expense.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.expense.count({ where }),
    db.expense.count(),
    db.expense.aggregate({ where: { date: { gte: parseDate(startOfMonth(today)), lte: parseDate(endOfMonth(today)) } }, _sum: { amount: true }, _count: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Running costs that are not subcontractor bills."
        actions={
          <>
            {anyAtAll > 0 && <LinkButton href="/api/export/expenses" variant="secondary" prefetch={false}><Download className="size-4" /> Export</LinkButton>}
            <LinkButton href="/expenses/new"><Plus className="size-4" /> New expense</LinkButton>
          </>
        }
      />
      {anyAtAll === 0 ? (
        <EmptyState icon={<HandCoins />} title="No expenses yet" text="Capture fuel, tolls, repairs, phone bills and other costs here so your profit report tells the full story." action={<LinkButton href="/expenses/new"><Plus className="size-4" /> New expense</LinkButton>} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat label="Spent this month" value={money(month._sum.amount, cur)} sub={`${month._count} expense${month._count === 1 ? "" : "s"}`} />
          </div>
          <SearchBox placeholder="Search category, vendor, description…" />
          {rows.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-slate-500">Nothing matches your search.</Card>
          ) : (
            <RowList>
              {rows.map((e) => (
                <Row key={e.id} href={`/expenses/${e.id}/edit`} title={e.category} subtitle={[fmtDate(e.date), e.vendor, e.description].filter(Boolean).join(" · ")} right={money(e.amount, cur)} rightSub={num(e.taxAmount) > 0 ? `incl. ${money(e.taxAmount, cur)} ${company.taxLabel}` : undefined} />
              ))}
            </RowList>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
