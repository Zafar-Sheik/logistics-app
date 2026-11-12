import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, Check, ChevronRight, CircleDashed, Clock, FileText, FileWarning, Package, Plus, Receipt, Send } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany, requireUser } from "@/lib/auth";
import { Badge, Card, CardHeader, LinkButton, Row } from "@/components/ui";
import { LOAD_STATUS } from "@/lib/domain";
import { addMonths, cx, endOfMonth, fmtDate, fmtMonth, money, moneyShort, num, parseDate, round2, startOfMonth, todayISO } from "@/lib/format";
import { Prisma } from "@/generated/prisma/client";
import { getContactNames, nameOf } from "@/lib/lookups";

export const metadata: Metadata = { title: "Home" };


type MonthRow = { m: string; total: unknown };

export default async function HomePage() {
  const user = await requireUser();
  const company = await requireCompany();
  const cur = company.currency;
  const today = todayISO();
  const todayDate = parseDate(today);
  const monthRange = { gte: parseDate(startOfMonth(today)), lte: parseDate(endOfMonth(today)) };
  const chartStart = parseDate(addMonths(today, -5));

  // Every figure on this screen comes from one query, so Home costs a single round trip.
  type Stats = Record<
    | "owed" | "owedCount" | "overdueAmt" | "overdueCount" | "owing" | "owingCount" | "readyAmt" | "readyCount"
    | "monthIncome" | "monthCosts" | "monthExpenses" | "activeLoads" | "toInvoice" | "drafts" | "noPod" | "noBill"
    | "customerCount" | "subCount" | "loadCount" | "invoiceCount" | "paymentCount",
    unknown
  >;
  const mFrom = monthRange.gte;
  const mTo = monthRange.lte;
  const paidInvoiceForLoad = Prisma.sql`SELECT 1 FROM DocumentLine dl JOIN Document d ON d.id = dl.documentId WHERE dl.loadId = b.loadId AND d.kind = 'INVOICE' AND d.status = 'PAID'`;
  const [statsRows, recentLoads, cashRows, names] = await Promise.all([
    db.$queryRaw<Stats[]>`
      SELECT
        (SELECT COALESCE(SUM(total - amountPaid), 0) FROM Document WHERE kind = 'INVOICE' AND status = 'SENT') AS owed,
        (SELECT COUNT(*) FROM Document WHERE kind = 'INVOICE' AND status = 'SENT') AS owedCount,
        (SELECT COALESCE(SUM(total - amountPaid), 0) FROM Document WHERE kind = 'INVOICE' AND status = 'SENT' AND dueDate < ${todayDate}) AS overdueAmt,
        (SELECT COUNT(*) FROM Document WHERE kind = 'INVOICE' AND status = 'SENT' AND dueDate < ${todayDate}) AS overdueCount,
        (SELECT COALESCE(SUM(total - amountPaid), 0) FROM Bill WHERE status = 'OPEN') AS owing,
        (SELECT COUNT(*) FROM Bill WHERE status = 'OPEN') AS owingCount,
        (SELECT COALESCE(SUM(b.total - b.amountPaid), 0) FROM Bill b WHERE b.status = 'OPEN' AND EXISTS (${paidInvoiceForLoad})) AS readyAmt,
        (SELECT COUNT(*) FROM Bill b WHERE b.status = 'OPEN' AND EXISTS (${paidInvoiceForLoad})) AS readyCount,
        (SELECT COALESCE(SUM(subtotal), 0) FROM Document WHERE kind = 'INVOICE' AND status IN ('SENT', 'PAID') AND issueDate BETWEEN ${mFrom} AND ${mTo}) AS monthIncome,
        (SELECT COALESCE(SUM(subtotal), 0) FROM Bill WHERE status <> 'VOID' AND issueDate BETWEEN ${mFrom} AND ${mTo}) AS monthCosts,
        (SELECT COALESCE(SUM(amount - taxAmount), 0) FROM Expense WHERE \`date\` BETWEEN ${mFrom} AND ${mTo}) AS monthExpenses,
        (SELECT COUNT(*) FROM \`Load\` WHERE status IN ('PLANNED', 'IN_TRANSIT')) AS activeLoads,
        (SELECT COUNT(*) FROM \`Load\` l WHERE l.status = 'DELIVERED' AND NOT EXISTS (
          SELECT 1 FROM DocumentLine dl JOIN Document d ON d.id = dl.documentId WHERE dl.loadId = l.id AND d.kind = 'INVOICE' AND d.status <> 'VOID')) AS toInvoice,
        (SELECT COUNT(*) FROM Document WHERE kind = 'INVOICE' AND status = 'DRAFT') AS drafts,
        (SELECT COUNT(*) FROM \`Load\` WHERE status = 'DELIVERED' AND podReceived = FALSE) AS noPod,
        (SELECT COUNT(*) FROM \`Load\` l WHERE l.status = 'DELIVERED' AND l.subcontractorId IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM Bill b WHERE b.loadId = l.id AND b.status <> 'VOID')) AS noBill,
        (SELECT COUNT(*) FROM Contact WHERE kind = 'CUSTOMER') AS customerCount,
        (SELECT COUNT(*) FROM Contact WHERE kind = 'SUBCONTRACTOR') AS subCount,
        (SELECT COUNT(*) FROM \`Load\`) AS loadCount,
        (SELECT COUNT(*) FROM Document WHERE kind = 'INVOICE') AS invoiceCount,
        (SELECT COUNT(*) FROM Payment) AS paymentCount`,
    db.load.findMany({ where: { status: { in: ["PLANNED", "IN_TRANSIT"] } }, orderBy: { pickupDate: "asc" }, take: 5 }),
    db.$queryRaw<(MonthRow & { kind: string })[]>`
      SELECT 'in' AS kind, DATE_FORMAT(\`date\`, '%Y-%m') AS m, SUM(amount) AS total FROM Payment WHERE direction = 'IN' AND \`date\` >= ${chartStart} GROUP BY m
      UNION ALL
      SELECT 'out', DATE_FORMAT(\`date\`, '%Y-%m'), SUM(amount) FROM Payment WHERE direction = 'OUT' AND \`date\` >= ${chartStart} GROUP BY DATE_FORMAT(\`date\`, '%Y-%m')
      UNION ALL
      SELECT 'exp', DATE_FORMAT(\`date\`, '%Y-%m'), SUM(amount) FROM Expense WHERE \`date\` >= ${chartStart} GROUP BY DATE_FORMAT(\`date\`, '%Y-%m')`,
    getContactNames(),
  ]);
  const st = statsRows[0];
  const n = (k: keyof Stats) => num(st[k]);
  const payIn = cashRows.filter((r) => r.kind === "in");
  const payOut = cashRows.filter((r) => r.kind === "out");
  const expOut = cashRows.filter((r) => r.kind === "exp");

  const customerCount = n("customerCount"), subCount = n("subCount"), loadCount = n("loadCount"), invoiceCount = n("invoiceCount"), paymentCount = n("paymentCount");
  const activeLoads = n("activeLoads"), toInvoice = n("toInvoice"), drafts = n("drafts"), noPod = n("noPod"), noBill = n("noBill");
  const owed = round2(n("owed"));
  const overdueAmt = round2(n("overdueAmt"));
  const owing = round2(n("owing"));
  const readyAmt = round2(n("readyAmt"));
  const receivable = { _count: n("owedCount") };
  const overdue = { _count: n("overdueCount") };
  const payable = { _count: n("owingCount") };
  const readyBills = { _count: n("readyCount") };
  const monthIncome = { _sum: { subtotal: n("monthIncome") } };
  const profit = round2(n("monthIncome") - n("monthCosts") - n("monthExpenses"));

  // ---- Things to do -------------------------------------------------------
  const todo = [
    toInvoice > 0 && { href: "/loads?filter=to-invoice", icon: FileText, tone: "bg-brand-50 text-brand-700", title: `${toInvoice} delivered load${toInvoice === 1 ? "" : "s"} to invoice`, text: "Raise the invoice so you can get paid." },
    drafts > 0 && { href: "/invoices?filter=draft", icon: Send, tone: "bg-violet-50 text-violet-700", title: `${drafts} draft invoice${drafts === 1 ? "" : "s"} to send`, text: "Share with your customer and mark as sent." },
    overdue._count > 0 && { href: "/invoices?filter=overdue", icon: AlertTriangle, tone: "bg-red-50 text-red-600", title: `${overdue._count} overdue invoice${overdue._count === 1 ? "" : "s"} · ${money(overdueAmt, cur)}`, text: "Follow up with these customers." },
    readyBills._count > 0 && { href: "/bills?filter=ready", icon: Banknote, tone: "bg-emerald-50 text-emerald-700", title: `${readyBills._count} subcontractor${readyBills._count === 1 ? "" : "s"} ready to pay · ${money(readyAmt, cur)}`, text: "Your customer has paid for these loads." },
    noBill > 0 && { href: "/loads?filter=no-bill", icon: Receipt, tone: "bg-amber-50 text-amber-700", title: `${noBill} load${noBill === 1 ? "" : "s"} awaiting a subcontractor bill`, text: "Capture their invoice when it arrives." },
    noPod > 0 && { href: "/loads?filter=no-pod", icon: FileWarning, tone: "bg-slate-100 text-slate-700", title: `${noPod} delivered load${noPod === 1 ? "" : "s"} without a POD`, text: "Get the signed proof of delivery." },
  ].filter((x): x is Exclude<typeof x, false | 0> => !!x);

  // ---- Getting started ----------------------------------------------------
  const setup = [
    { done: !!(company.addressLine1 && company.logo), href: "/settings/company", label: "Add your logo and company address" },
    { done: !!company.bankAccountNumber, href: "/settings/banking", label: "Add your banking details (shown on invoices)" },
    { done: customerCount > 0, href: "/customers/new", label: "Add your first customer" },
    { done: subCount > 0, href: "/subcontractors/new", label: "Add your first subcontractor" },
    { done: loadCount > 0, href: "/loads/new", label: "Book your first load" },
    { done: invoiceCount > 0, href: "/invoices/new", label: "Raise your first invoice" },
    { done: paymentCount > 0, href: "/invoices", label: "Record your first payment" },
  ];
  const setupDone = setup.filter((s) => s.done).length;
  const nextSetup = setup.find((s) => !s.done);

  // ---- Cash flow chart ----------------------------------------------------
  const months = Array.from({ length: 6 }, (_, i) => addMonths(today, i - 5).slice(0, 7));
  const pick = (rows: MonthRow[], m: string) => num(rows.find((r) => r.m === m)?.total);
  const chart = months.map((m) => ({ m, moneyIn: pick(payIn, m), moneyOut: round2(pick(payOut, m) + pick(expOut, m)) }));
  const max = Math.max(1, ...chart.flatMap((c) => [c.moneyIn, c.moneyOut]));
  const hasCash = chart.some((c) => c.moneyIn > 0 || c.moneyOut > 0);

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.APP_TIMEZONE || "Africa/Johannesburg" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">{fmtDate(today)} · here is where your business stands.</p>
        </div>
        <LinkButton href="/loads/new" className="max-sm:hidden"><Plus className="size-4" /> New load</LinkButton>
      </div>

      {nextSetup && (
        <Card className="mb-4 overflow-hidden" data-tour="setup">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Getting started</h2>
              <p className="text-sm text-slate-500">{setupDone} of {setup.length} done</p>
            </div>
            <LinkButton href={nextSetup.href} size="sm">Next step <ArrowRight className="size-4" /></LinkButton>
          </div>
          <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:mx-5">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(setupDone / setup.length) * 100}%` }} />
          </div>
          <ul className="mt-2 px-2 pb-2 sm:px-3">
            {setup.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-slate-50">
                  {s.done ? <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="size-3.5" /></span> : <CircleDashed className="size-5 text-slate-300" />}
                  <span className={cx("flex-1", s.done ? "text-slate-400 line-through" : s === nextSetup ? "font-semibold text-slate-900" : "text-slate-700")}>{s.label}</span>
                  {!s.done && <ChevronRight className="size-4 text-slate-300" />}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/invoices?filter=unpaid" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:bg-slate-50">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Customers owe you</div>
          <div className="tabular mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{money(owed, cur)}</div>
          <div className={cx("mt-0.5 text-xs", overdueAmt > 0 ? "font-medium text-red-600" : "text-slate-500")}>{overdueAmt > 0 ? `${money(overdueAmt, cur)} overdue` : `${receivable._count} unpaid invoice${receivable._count === 1 ? "" : "s"}`}</div>
        </Link>
        <Link href="/bills?filter=open" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:bg-slate-50">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">You owe subcontractors</div>
          <div className="tabular mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{money(owing, cur)}</div>
          <div className={cx("mt-0.5 text-xs", readyAmt > 0 ? "font-medium text-emerald-600" : "text-slate-500")}>{readyAmt > 0 ? `${money(readyAmt, cur)} ready to pay` : `${payable._count} unpaid bill${payable._count === 1 ? "" : "s"}`}</div>
        </Link>
        <Link href="/reports/profit-loss" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:bg-slate-50">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Profit this month</div>
          <div className={cx("tabular mt-1 text-xl font-bold tracking-tight sm:text-2xl", profit < 0 ? "text-red-600" : "text-emerald-600")}>{money(profit, cur)}</div>
          <div className="mt-0.5 text-xs text-slate-500">{money(monthIncome._sum.subtotal, cur)} invoiced</div>
        </Link>
        <Link href="/loads?filter=active" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:bg-slate-50">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Loads on the go</div>
          <div className="tabular mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{activeLoads}</div>
          <div className="mt-0.5 text-xs text-slate-500">Booked or in transit</div>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card data-tour="todo">
          <CardHeader title="To do" subtitle={todo.length ? "Tap an item to deal with it." : undefined} />
          {todo.length === 0 ? (
            <div className="flex flex-col items-center px-6 pb-8 pt-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-6" /></span>
              <p className="mt-3 text-sm font-medium text-slate-900">You are all caught up</p>
              <p className="text-sm text-slate-500">Loads to invoice, overdue invoices and subcontractors to pay will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {todo.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                    <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-xl", t.tone)}><t.icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{t.title}</span>
                      <span className="block text-xs text-slate-500">{t.text}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Cash flow" subtitle="Money received and paid out, last 6 months" />
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            {hasCash ? (
              <>
                <div className="flex h-40 items-end gap-2 border-b border-slate-200" role="img" aria-label="Bar chart of money in and money out per month">
                  {chart.map((c) => (
                    <div key={c.m} className="flex h-full flex-1 items-end justify-center gap-1">
                      <div className="w-1/3 max-w-6 rounded-t bg-emerald-500" style={{ height: `${Math.max(c.moneyIn > 0 ? 2 : 0, (c.moneyIn / max) * 100)}%` }} title={`In: ${money(c.moneyIn, cur)}`} />
                      <div className="w-1/3 max-w-6 rounded-t bg-slate-400" style={{ height: `${Math.max(c.moneyOut > 0 ? 2 : 0, (c.moneyOut / max) * 100)}%` }} title={`Out: ${money(c.moneyOut, cur)}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-2">
                  {chart.map((c) => (
                    <div key={c.m} className="flex-1 text-center">
                      <div className="text-[11px] font-medium text-slate-500">{fmtMonth(`${c.m}-01`)}</div>
                      <div className="tabular text-[10px] text-emerald-600">{c.moneyIn > 0 ? moneyShort(c.moneyIn, cur) : ""}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" /> Money in</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-400" /> Money out</span>
                </div>
              </>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
                <Clock className="size-6 text-slate-300" />
                <p className="mt-2 max-w-56 text-sm text-slate-500">Your cash flow chart appears once you record your first payment.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Loads on the go" action={<Link href="/loads" className="text-sm font-medium text-brand-600">View all</Link>} />
        {recentLoads.length === 0 ? (
          <div className="flex flex-col items-center px-6 pb-8 text-center">
            <Package className="size-7 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No loads booked or in transit.</p>
            <LinkButton href="/loads/new" variant="secondary" size="sm" className="mt-3"><Plus className="size-4" /> Book a load</LinkButton>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {recentLoads.map((l) => (
              <Row key={l.id} href={`/loads/${l.id}`} title={`${l.origin} → ${l.destination}`} subtitle={`${l.number} · ${nameOf(names, l.customerId)} · ${fmtDate(l.pickupDate)}`} rightSub={<Badge tone={LOAD_STATUS[l.status].tone}>{LOAD_STATUS[l.status].label}</Badge>} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
