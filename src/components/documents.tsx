import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, Ban, Banknote, Building2, Check, FileText, Pencil, Plus, ScrollText, Send, Trash2, X } from "lucide-react";
import { db } from "@/lib/db";
import { isAdmin, requireCompany, requireUser } from "@/lib/auth";
import { convertQuoteToInvoice, deleteDocument, markDocumentSent, setQuoteStatus, voidDocument } from "@/actions/documents";
import { deletePayment, recordInvoicePayment } from "@/actions/money";
import { getDocumentView } from "@/lib/documents";
import { docStatus, loadLineDescription, PAYMENT_METHODS } from "@/lib/domain";
import { addDays, CURRENCIES, fmtDate, isoDate, money, num, parseDate, round2, todayISO } from "@/lib/format";
import { linker, one, PAGE_SIZE, pageOf } from "@/lib/params";
import type { Prisma } from "@/generated/prisma/client";
import { DocEditor } from "./doc-editor";
import { DocumentPaper } from "./document-paper";
import { PaymentButton } from "./payment-form";
import { SearchBox } from "./search-box";
import { ShareDocument } from "./share-document";
import { ActionButton, ConfirmAction } from "./sheet";
import { Alert, Badge, Card, CardHeader, EmptyState, FilterTabs, LinkButton, PageHeader, Pagination, Row, RowList, Stat } from "./ui";

type Kind = "INVOICE" | "QUOTE";
const meta = (kind: Kind) =>
  kind === "INVOICE" ? { base: "/invoices", one: "invoice", many: "Invoices", Icon: FileText } : { base: "/quotes", one: "quote", many: "Quotes", Icon: ScrollText };

// ---- List ------------------------------------------------------------------

export async function DocList({ kind, searchParams }: { kind: Kind; searchParams: Record<string, string | string[] | undefined> }) {
  const m = meta(kind);
  const company = await requireCompany();
  const cur = company.currency;
  const today = todayISO();
  const todayDate = parseDate(today);
  const q = one(searchParams.q);
  const filter = one(searchParams.filter) || "all";
  const page = pageOf(searchParams.page);
  const href = linker(m.base, { q, filter });

  const filters: Record<string, Prisma.DocumentWhereInput> =
    kind === "INVOICE"
      ? {
          all: {},
          draft: { status: "DRAFT" },
          unpaid: { status: "SENT" },
          overdue: { status: "SENT", dueDate: { lt: todayDate } },
          paid: { status: "PAID" },
          void: { status: "VOID" },
        }
      : { all: {}, draft: { status: "DRAFT" }, sent: { status: "SENT" }, accepted: { status: "ACCEPTED" }, declined: { status: "DECLINED" } };
  const search: Prisma.DocumentWhereInput = q ? { OR: [{ number: { contains: q } }, { reference: { contains: q } }, { customer: { name: { contains: q } } }] } : {};
  const where: Prisma.DocumentWhereInput = { AND: [{ kind }, filters[filter] ?? {}, search] };

  const [rows, total, anyAtAll, open, overdue, drafts] = await Promise.all([
    db.document.findMany({ where, include: { customer: { select: { name: true } } }, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.document.count({ where }),
    db.document.count({ where: { kind } }),
    db.document.aggregate({ where: { kind: "INVOICE", status: "SENT" }, _sum: { total: true, amountPaid: true }, _count: true }),
    db.document.aggregate({ where: { kind: "INVOICE", status: "SENT", dueDate: { lt: todayDate } }, _sum: { total: true, amountPaid: true }, _count: true }),
    db.document.count({ where: { kind, status: "DRAFT" } }),
  ]);

  const tabs =
    kind === "INVOICE"
      ? [
          { key: "all", label: "All" },
          { key: "draft", label: "Drafts", count: drafts },
          { key: "unpaid", label: "Unpaid", count: open._count },
          { key: "overdue", label: "Overdue", count: overdue._count },
          { key: "paid", label: "Paid" },
          { key: "void", label: "Void" },
        ]
      : [
          { key: "all", label: "All" },
          { key: "draft", label: "Drafts", count: drafts },
          { key: "sent", label: "Sent" },
          { key: "accepted", label: "Accepted" },
          { key: "declined", label: "Declined" },
        ];

  return (
    <>
      <PageHeader
        title={m.many}
        subtitle={kind === "INVOICE" ? "What your customers owe you." : "Prices you have offered to customers."}
        actions={<LinkButton href={`${m.base}/new`}><Plus className="size-4" /> New {m.one}</LinkButton>}
      />
      {anyAtAll === 0 ? (
        <EmptyState
          icon={<m.Icon />}
          title={kind === "INVOICE" ? "No invoices yet" : "No quotes yet"}
          text={
            kind === "INVOICE"
              ? "Raise an invoice from a delivered load in one tap, or create one from scratch. Your logo and banking details are added automatically."
              : "Send a customer a price before the job. When they accept, turn the quote into an invoice in one tap."
          }
          action={<LinkButton href={`${m.base}/new`}><Plus className="size-4" /> New {m.one}</LinkButton>}
        />
      ) : (
        <>
          {kind === "INVOICE" && (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Stat label="Customers owe you" value={money(num(open._sum.total) - num(open._sum.amountPaid), cur)} sub={`${open._count} unpaid invoice${open._count === 1 ? "" : "s"}`} />
              <Stat label="Overdue" value={money(num(overdue._sum.total) - num(overdue._sum.amountPaid), cur)} tone={overdue._count > 0 ? "red" : undefined} sub={`${overdue._count} invoice${overdue._count === 1 ? "" : "s"}`} />
            </div>
          )}
          <SearchBox placeholder={`Search ${m.one} no., customer, reference…`} />
          <FilterTabs tabs={tabs} active={filter} hrefFor={(k) => href({ filter: k === "all" ? null : k, page: null })} />
          {rows.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-slate-500">Nothing in this view.</Card>
          ) : (
            <RowList>
              {rows.map((d) => {
                const s = docStatus(d, today);
                const bal = round2(num(d.total) - num(d.amountPaid));
                return (
                  <Row
                    key={d.id}
                    href={`${m.base}/${d.id}`}
                    title={d.customer.name}
                    subtitle={`${d.number} · ${fmtDate(d.issueDate)}`}
                    meta={<><Badge tone={s.tone}>{s.label}</Badge>{kind === "INVOICE" && d.status === "SENT" && <span className="text-xs text-slate-500">due {fmtDate(d.dueDate)}</span>}</>}
                    right={money(d.total, cur)}
                    rightSub={kind === "INVOICE" && d.status === "SENT" && num(d.amountPaid) > 0 ? `${money(bal, cur)} due` : undefined}
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

// ---- Create / edit ---------------------------------------------------------

export async function DocFormPage({ kind, id, preset }: { kind: Kind; id?: string; preset?: { load?: string; customer?: string } }) {
  const m = meta(kind);
  const company = await requireCompany();
  const existing = id ? await db.document.findFirst({ where: { id, kind }, include: { lines: { orderBy: { position: "asc" } } } }) : null;
  if (id && !existing) notFound();

  const back = { href: existing ? `${m.base}/${existing.id}` : m.base, label: existing ? existing.number : m.many };
  if (existing && (["VOID", "PAID"].includes(existing.status) || num(existing.amountPaid) > 0)) {
    return (
      <>
        <PageHeader title={`Edit ${existing.number}`} back={back} />
        <Alert tone="amber">This {m.one} has payments recorded or is closed, so it can no longer be edited. Delete the payments first if you need to change it.</Alert>
      </>
    );
  }

  const customers = await db.contact.findMany({
    where: { kind: "CUSTOMER", OR: [{ archived: false }, ...(existing ? [{ id: existing.customerId }] : [])] },
    select: { id: true, name: true, paymentTerms: true },
    orderBy: { name: "asc" },
  });
  if (customers.length === 0) {
    return (
      <>
        <PageHeader title={`New ${m.one}`} back={back} />
        <EmptyState icon={<Building2 />} title="Add a customer first" text={`Every ${m.one} is addressed to a customer. Add one and you will come straight back here.`} action={<LinkButton href={`/customers/new?returnTo=${m.base}/new`}>Add a customer</LinkButton>} />
      </>
    );
  }

  // Loads that can still be invoiced (not cancelled, not on another live invoice).
  const loads =
    kind === "INVOICE"
      ? await db.load.findMany({
          where: { status: { not: "CANCELLED" }, lines: { none: { document: { kind: "INVOICE", status: { not: "VOID" }, ...(id ? { id: { not: id } } : {}) } } } },
          orderBy: { pickupDate: "desc" },
          take: 300,
        })
      : [];

  const today = todayISO();
  const taxRate = company.taxRegistered ? num(company.taxRate) : 0;
  const presetLoad = !existing && preset?.load ? loads.find((l) => l.id === preset.load) : undefined;
  const presetCustomer = presetLoad?.customerId ?? (customers.some((c) => c.id === preset?.customer) ? preset!.customer! : "");
  const terms = (cid: string) => customers.find((c) => c.id === cid)?.paymentTerms ?? company.paymentTermsDays;

  return (
    <>
      <PageHeader title={existing ? `Edit ${existing.number}` : `New ${m.one}`} back={back} />
      <DocEditor
        kind={kind}
        id={existing?.id ?? null}
        customers={customers.map((c) => ({ id: c.id, name: c.name, terms: c.paymentTerms ?? company.paymentTermsDays }))}
        loads={loads.map((l) => ({ id: l.id, customerId: l.customerId, number: l.number, route: `${l.origin} → ${l.destination}`, description: loadLineDescription(l), rate: num(l.customerRate) }))}
        currency={company.currency}
        symbol={CURRENCIES[company.currency]?.symbol ?? company.currency}
        taxLabel={company.taxLabel}
        taxRate={taxRate}
        cancelHref={back.href}
        initial={
          existing
            ? {
                customerId: existing.customerId,
                issueDate: isoDate(existing.issueDate),
                dueDate: isoDate(existing.dueDate),
                reference: existing.reference ?? "",
                notes: existing.notes ?? "",
                lines: existing.lines.map((l) => ({ description: l.description, quantity: num(l.quantity), unitPrice: num(l.unitPrice), taxRate: num(l.taxRate), loadId: l.loadId })),
              }
            : {
                customerId: presetCustomer,
                issueDate: today,
                dueDate: addDays(today, kind === "INVOICE" ? (presetCustomer ? terms(presetCustomer) : company.paymentTermsDays) : 30),
                reference: presetLoad?.customerRef ?? "",
                notes: (kind === "INVOICE" ? company.invoiceNotes : company.quoteNotes) ?? "",
                lines: presetLoad ? [{ description: loadLineDescription(presetLoad), quantity: 1, unitPrice: num(presetLoad.customerRate), taxRate, loadId: presetLoad.id }] : [],
              }
        }
      />
    </>
  );
}

// ---- Detail ----------------------------------------------------------------

export async function DocDetail({ kind, id }: { kind: Kind; id: string }) {
  const m = meta(kind);
  const user = await requireUser();
  const doc = await getDocumentView(id);
  if (!doc || doc.kind !== kind) notFound();
  const cur = doc.currency;
  const today = todayISO();
  const admin = isAdmin(user);
  const isInvoice = kind === "INVOICE";
  const editable = !["VOID", "PAID"].includes(doc.rawStatus) && doc.amountPaid === 0;
  const canPay = isInvoice && ["DRAFT", "SENT"].includes(doc.rawStatus) && doc.balance > 0;

  const [invoiceFromQuote, sourceQuote] = await Promise.all([
    !isInvoice ? db.document.findFirst({ where: { quoteId: id, kind: "INVOICE", status: { not: "VOID" } }, select: { id: true, number: true } }) : null,
    isInvoice && doc.quoteId ? db.document.findUnique({ where: { id: doc.quoteId }, select: { id: true, number: true } }) : null,
  ]);

  const bank = doc.company.bank;
  const greeting = `Hi${doc.customer.contactPerson ? ` ${doc.customer.contactPerson.split(" ")[0]}` : ""},`;
  const message = isInvoice
    ? [
        greeting,
        "",
        `Please find ${doc.title.toLowerCase()} ${doc.number} from ${doc.company.name}.`,
        `Amount due: ${money(doc.balance, cur)}`,
        `Due date: ${doc.dueDate}`,
        ...(bank ? ["", "Banking details:", ...[bank.bankName, `Account name: ${bank.accountName}`, `Account no: ${bank.accountNumber}`, bank.branchCode && `Branch code: ${bank.branchCode}`, `Reference: ${doc.number}`].filter(Boolean)] : []),
        "",
        "Thank you.",
      ].join("\n")
    : [greeting, "", `Please find quotation ${doc.number} from ${doc.company.name}.`, `Total: ${money(doc.total, cur)}`, `Valid until: ${doc.dueDate}`, "", "Let me know if you would like to go ahead.", "", "Thank you."].join("\n");

  return (
    <>
      <PageHeader
        title={doc.number}
        back={{ href: m.base, label: m.many }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={doc.status.tone}>{doc.status.label}</Badge>
            <Link href={`/customers/${doc.customer.id}`} className="font-medium text-brand-700">{doc.customer.name}</Link>
          </span>
        }
        actions={
          <>
            {doc.rawStatus !== "VOID" && (
              <ShareDocument id={id} number={doc.number} title={doc.title} isDraft={doc.rawStatus === "DRAFT"} customerName={doc.customer.name} customerEmail={doc.customer.email} customerPhone={doc.customer.phone} companyName={doc.company.name} message={message} />
            )}
            {editable && <LinkButton href={`${m.base}/${id}/edit`} variant="secondary"><Pencil className="size-4" /> Edit</LinkButton>}
          </>
        }
      />

      <div className="no-print space-y-4">
        {doc.rawStatus === "DRAFT" && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/60 p-4">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-slate-900">This {m.one} is a draft</div>
              <p className="text-sm text-slate-600">Check it below, then tap <b>Send</b> to share it{isInvoice ? "" : " with your customer"}. Already sent it another way?</p>
            </div>
            <ActionButton action={markDocumentSent.bind(null, id)} variant="secondary" icon={<Send className="size-4" />}>Mark as sent</ActionButton>
          </Card>
        )}

        {isInvoice && doc.rawStatus !== "DRAFT" && doc.rawStatus !== "VOID" && (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{doc.balance > 0 ? "Balance due" : "Paid in full"}</div>
                <div className={`tabular text-2xl font-bold ${doc.balance > 0 ? "text-slate-900" : "text-emerald-600"}`}>{money(doc.balance > 0 ? doc.balance : doc.total, cur)}</div>
                {doc.balance > 0 && <div className="text-xs text-slate-500">of {money(doc.total, cur)} · due {doc.dueDate}</div>}
              </div>
              {canPay && (
                <PaymentButton action={recordInvoicePayment.bind(null, id)} label="Record payment" title={`Payment for ${doc.number}`} balance={doc.balance} symbol={CURRENCIES[cur]?.symbol ?? cur} today={today} icon={<Banknote className="size-4" />} note={`Money received from ${doc.customer.name}.`} />
              )}
            </div>
            {doc.payments.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {doc.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">{p.date}</span>
                      <span className="block truncate text-xs text-slate-500">{PAYMENT_METHODS[p.method]}{p.reference ? ` · ${p.reference}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="tabular font-semibold text-emerald-600">{money(p.amount, cur)}</span>
                      {admin && (
                        <ConfirmAction label={<span className="sr-only">Delete payment</span>} icon={<Trash2 className="size-4" />} variant="ghost" size="sm" title="Delete this payment?" message={`This removes the ${money(p.amount, cur)} payment and re-opens the balance on ${doc.number}.`} confirmLabel="Delete payment" action={deletePayment.bind(null, p.id)} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {!isInvoice && (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            {invoiceFromQuote ? (
              <>
                <p className="text-sm text-slate-600">This quote was turned into invoice <b>{invoiceFromQuote.number}</b>.</p>
                <LinkButton href={`/invoices/${invoiceFromQuote.id}`} variant="secondary">Open invoice</LinkButton>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">{doc.rawStatus === "DECLINED" ? "The customer declined this quote." : "When the customer says yes, turn this quote into an invoice."}</p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={convertQuoteToInvoice.bind(null, id)} icon={<ArrowRightLeft className="size-4" />}>Convert to invoice</ActionButton>
                  {doc.rawStatus !== "ACCEPTED" && <ActionButton action={setQuoteStatus.bind(null, id, "ACCEPTED")} variant="secondary" icon={<Check className="size-4" />}>Accepted</ActionButton>}
                  {doc.rawStatus !== "DECLINED" && <ActionButton action={setQuoteStatus.bind(null, id, "DECLINED")} variant="secondary" icon={<X className="size-4" />}>Declined</ActionButton>}
                </div>
              </>
            )}
          </Card>
        )}

        {sourceQuote && <p className="text-sm text-slate-500">Created from quote <Link className="font-medium text-brand-700" href={`/quotes/${sourceQuote.id}`}>{sourceQuote.number}</Link>.</p>}
      </div>

      <div className="mt-4">
        <DocumentPaper doc={doc} />
      </div>

      {doc.lines.some((l) => l.loadId) && (
        <Card className="no-print mt-4">
          <CardHeader title="Loads on this document" />
          <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
            {[...new Set(doc.lines.map((l) => l.loadId).filter((x): x is string => !!x))].map((loadId, i) => (
              <LinkButton key={loadId} href={`/loads/${loadId}`} variant="secondary" size="sm">Open load {i + 1}</LinkButton>
            ))}
          </div>
        </Card>
      )}

      <div className="no-print mt-4 flex flex-wrap gap-2">
        {isInvoice && admin && !["VOID", "DRAFT"].includes(doc.rawStatus) && doc.amountPaid === 0 && (
          <ConfirmAction label="Void invoice" icon={<Ban className="size-4" />} variant="ghost" title={`Void ${doc.number}?`} message="The invoice stays on record for your audit trail but no longer counts as money owed. Its loads become available to invoice again. This cannot be undone." confirmLabel="Void invoice" action={voidDocument.bind(null, id)} />
        )}
        {(!isInvoice || doc.rawStatus === "DRAFT") && (
          <ConfirmAction label="Delete" icon={<Trash2 className="size-4" />} variant="dangerGhost" title={`Delete ${doc.number}?`} message={`This permanently removes the ${m.one}.`} confirmLabel="Delete" action={deleteDocument.bind(null, id)} />
        )}
      </div>
    </>
  );
}
