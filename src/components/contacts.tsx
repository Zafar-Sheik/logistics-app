import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Building2, Mail, MessageCircle, Pencil, Phone, Plus, Printer, Trash2, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { isAdmin, requireCompany, requireUser } from "@/lib/auth";
import { deleteContact, saveContact, setContactArchived } from "@/actions/contacts";
import { billStatus, docStatus, LOAD_STATUS } from "@/lib/domain";
import { fmtDate, money, num, round2, todayISO } from "@/lib/format";
import { linker, one, PAGE_SIZE, pageOf } from "@/lib/params";
import { ActionForm, FormFooter, FormMessage, FormSection, SubmitButton, TextAreaField, TextField } from "./form";
import { SearchBox } from "./search-box";
import { ActionButton, ConfirmAction } from "./sheet";
import { Avatar, Badge, Card, CardHeader, Detail, EmptyState, FilterTabs, LinkButton, PageHeader, Pagination, Row, RowList, Stat } from "./ui";

type Kind = "CUSTOMER" | "SUBCONTRACTOR";
const meta = (kind: Kind) =>
  kind === "CUSTOMER"
    ? { base: "/customers", one: "customer", many: "Customers", Icon: Building2 }
    : { base: "/subcontractors", one: "subcontractor", many: "Subcontractors", Icon: Truck };

export async function ContactList({ kind, searchParams }: { kind: Kind; searchParams: Record<string, string | string[] | undefined> }) {
  const m = meta(kind);
  const company = await requireCompany();
  const q = one(searchParams.q);
  const show = one(searchParams.show) || "active";
  const page = pageOf(searchParams.page);
  const href = linker(m.base, { q, show });

  const where = {
    kind,
    archived: show === "archived",
    ...(q ? { OR: [{ name: { contains: q } }, { contactPerson: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
  };
  const [rows, total, anyAtAll] = await Promise.all([
    db.contact.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.contact.count({ where }),
    db.contact.count({ where: { kind } }),
  ]);

  // Outstanding balance per contact, for the rows on this page.
  const ids = rows.map((r) => r.id);
  const balances = new Map<string, number>();
  if (ids.length) {
    if (kind === "CUSTOMER") {
      const g = await db.document.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, kind: "INVOICE", status: "SENT" }, _sum: { total: true, amountPaid: true } });
      for (const r of g) balances.set(r.customerId, round2(num(r._sum.total) - num(r._sum.amountPaid)));
    } else {
      const g = await db.bill.groupBy({ by: ["subcontractorId"], where: { subcontractorId: { in: ids }, status: "OPEN" }, _sum: { total: true, amountPaid: true } });
      for (const r of g) balances.set(r.subcontractorId, round2(num(r._sum.total) - num(r._sum.amountPaid)));
    }
  }

  return (
    <>
      <PageHeader
        title={m.many}
        subtitle={kind === "CUSTOMER" ? "The companies you move freight for and invoice." : "The trucking companies you give work to and pay."}
        actions={
          <LinkButton href={`${m.base}/new`}>
            <Plus className="size-4" /> New {m.one}
          </LinkButton>
        }
      />
      {anyAtAll === 0 ? (
        <EmptyState
          icon={<m.Icon />}
          title={`No ${m.many.toLowerCase()} yet`}
          text={kind === "CUSTOMER" ? "Add the first company you do work for. You will pick them when booking loads and raising invoices." : "Add the first trucking company you sub work out to. You will pick them when booking loads and capturing their bills."}
          action={<LinkButton href={`${m.base}/new`}><Plus className="size-4" /> Add {m.one}</LinkButton>}
        />
      ) : (
        <>
          <SearchBox placeholder={`Search ${m.many.toLowerCase()}`} />
          <FilterTabs tabs={[{ key: "active", label: "Active" }, { key: "archived", label: "Archived" }]} active={show} hrefFor={(k) => href({ show: k, page: null })} />
          {rows.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-slate-500">Nothing matches. Try a different search.</Card>
          ) : (
            <RowList>
              {rows.map((c) => {
                const bal = balances.get(c.id) ?? 0;
                return (
                  <Row
                    key={c.id}
                    href={`${m.base}/${c.id}`}
                    leading={<Avatar name={c.name} tone={kind === "CUSTOMER" ? "brand" : "amber"} />}
                    title={c.name}
                    subtitle={[c.contactPerson, c.phone].filter(Boolean).join(" · ") || c.email || "No contact details yet"}
                    right={bal > 0 ? money(bal, company.currency) : undefined}
                    rightSub={bal > 0 ? (kind === "CUSTOMER" ? "owes you" : "you owe") : undefined}
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

export async function ContactFormPage({ kind, id, returnTo }: { kind: Kind; id?: string; returnTo?: string }) {
  const m = meta(kind);
  await requireUser();
  const c = id ? await db.contact.findFirst({ where: { id, kind } }) : null;
  if (id && !c) notFound();
  const isSub = kind === "SUBCONTRACTOR";
  return (
    <>
      <PageHeader title={c ? `Edit ${c.name}` : `New ${m.one}`} back={{ href: c ? `${m.base}/${c.id}` : returnTo || m.base, label: c ? c.name : returnTo ? "Back" : m.many }} />
      <ActionForm action={saveContact.bind(null, kind, c?.id ?? null, returnTo ?? null)} className="space-y-4">
        <FormMessage />
        <FormSection title="Company">
          <TextField name="name" label="Company name" defaultValue={c?.name} required wrapClass="sm:col-span-2" autoFocus={!c} />
          <TextField name="contactPerson" label="Contact person" defaultValue={c?.contactPerson ?? ""} optional />
          <TextField name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={c?.phone ?? ""} optional />
          <TextField name="email" label="Email" type="email" inputMode="email" autoCapitalize="none" defaultValue={c?.email ?? ""} optional wrapClass="sm:col-span-2" hint={isSub ? undefined : "Used when you share invoices by email."} />
          <TextAreaField name="address" label="Address" defaultValue={c?.address ?? ""} optional wrapClass="sm:col-span-2" hint={isSub ? undefined : "Printed on invoices under “Bill to”."} />
        </FormSection>
        <FormSection title="Tax & terms">
          <TextField name="vatNumber" label="VAT number" defaultValue={c?.vatNumber ?? ""} optional />
          <TextField name="regNumber" label="Company registration no." defaultValue={c?.regNumber ?? ""} optional />
          <TextField
            name="paymentTerms"
            label="Payment terms (days)"
            inputMode="numeric"
            defaultValue={c?.paymentTerms ?? ""}
            optional
            hint={isSub ? "How long you have to pay them, e.g. 30." : "How long they have to pay you. Leave blank to use your default."}
          />
        </FormSection>
        {isSub && (
          <FormSection title="Their banking details" description="So you have them on hand when it is time to pay.">
            <TextField name="bankName" label="Bank" defaultValue={c?.bankName ?? ""} optional />
            <TextField name="bankAccountName" label="Account name" defaultValue={c?.bankAccountName ?? ""} optional />
            <TextField name="bankAccountNumber" label="Account number" inputMode="numeric" defaultValue={c?.bankAccountNumber ?? ""} optional />
            <TextField name="bankBranchCode" label="Branch code" inputMode="numeric" defaultValue={c?.bankBranchCode ?? ""} optional />
          </FormSection>
        )}
        <FormSection title="Notes">
          <TextAreaField name="notes" defaultValue={c?.notes ?? ""} wrapClass="sm:col-span-2" placeholder="Anything worth remembering (private, never shown on documents)" />
        </FormSection>
        <FormFooter>
          <LinkButton href={c ? `${m.base}/${c.id}` : returnTo || m.base} variant="ghost">Cancel</LinkButton>
          <SubmitButton>{c ? "Save changes" : `Save ${m.one}`}</SubmitButton>
        </FormFooter>
      </ActionForm>
    </>
  );
}

export async function ContactDetail({ kind, id }: { kind: Kind; id: string }) {
  const m = meta(kind);
  const user = await requireUser();
  const company = await requireCompany();
  const c = await db.contact.findFirst({ where: { id, kind } });
  if (!c) notFound();
  const today = todayISO();
  const cur = company.currency;
  const isCustomer = kind === "CUSTOMER";

  const [loads, docs, bills, loadCount] = await Promise.all([
    db.load.findMany({ where: isCustomer ? { customerId: id } : { subcontractorId: id }, orderBy: { pickupDate: "desc" }, take: 5 }),
    isCustomer ? db.document.findMany({ where: { customerId: id, kind: "INVOICE", status: { not: "VOID" } }, orderBy: { issueDate: "desc" } }) : [],
    !isCustomer ? db.bill.findMany({ where: { subcontractorId: id, status: { not: "VOID" } }, orderBy: { issueDate: "desc" } }) : [],
    db.load.count({ where: isCustomer ? { customerId: id } : { subcontractorId: id } }),
  ]);

  const items = isCustomer ? docs.filter((d) => d.status !== "DRAFT") : bills;
  const billed = items.reduce((a, d) => a + num(d.total), 0);
  const paid = items.reduce((a, d) => a + num(d.amountPaid), 0);
  const outstanding = round2(billed - paid);
  const overdue = round2(
    items.filter((d) => (d.status === "SENT" || d.status === "OPEN") && d.dueDate.toISOString().slice(0, 10) < today).reduce((a, d) => a + num(d.total) - num(d.amountPaid), 0),
  );
  const wa = c.phone?.replace(/[^\d]/g, "");

  return (
    <>
      <PageHeader
        title={c.name}
        back={{ href: m.base, label: m.many }}
        subtitle={c.archived ? <Badge>Archived</Badge> : c.contactPerson}
        actions={
          <>
            {isCustomer && (
              <LinkButton href={`/customers/${id}/statement`} variant="secondary">
                <Printer className="size-4" /> Statement
              </LinkButton>
            )}
            <LinkButton href={`${m.base}/${id}/edit`} variant="secondary">
              <Pencil className="size-4" /> Edit
            </LinkButton>
          </>
        }
      />

      {(c.phone || c.email) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200"><Phone className="size-4 text-brand-600" /> Call</a>}
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200"><MessageCircle className="size-4 text-emerald-600" /> WhatsApp</a>}
          {c.email && <a href={`mailto:${c.email}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200"><Mail className="size-4 text-brand-600" /> Email</a>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={isCustomer ? "Owes you" : "You owe"} value={money(outstanding, cur)} tone={outstanding > 0 ? "amber" : undefined} />
        <Stat label="Overdue" value={money(overdue, cur)} tone={overdue > 0 ? "red" : undefined} />
        <Stat label={isCustomer ? "Invoiced" : "Billed"} value={money(billed, cur)} sub="All time, incl. tax" />
        <Stat label="Loads" value={loadCount} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={isCustomer ? "Invoices" : "Bills"}
            action={
              <LinkButton href={isCustomer ? `/invoices/new?customer=${id}` : `/bills/new?subcontractor=${id}`} variant="secondary" size="sm">
                <Plus className="size-4" /> New
              </LinkButton>
            }
          />
          {(isCustomer ? docs : bills).length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">{isCustomer ? "No invoices for this customer yet." : "No bills from this subcontractor yet."}</p>
          ) : (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {isCustomer
                ? docs.slice(0, 8).map((d) => {
                    const s = docStatus(d, today);
                    return <Row key={d.id} href={`/invoices/${d.id}`} title={d.number} subtitle={`${fmtDate(d.issueDate)} · due ${fmtDate(d.dueDate)}`} right={money(d.total, cur)} rightSub={<Badge tone={s.tone}>{s.label}</Badge>} />;
                  })
                : bills.slice(0, 8).map((b) => {
                    const s = billStatus(b, today);
                    return <Row key={b.id} href={`/bills/${b.id}`} title={b.number} subtitle={`${fmtDate(b.issueDate)} · due ${fmtDate(b.dueDate)}`} right={money(b.total, cur)} rightSub={<Badge tone={s.tone}>{s.label}</Badge>} />;
                  })}
              {(isCustomer ? docs : bills).length > 8 && (
                <Link href={isCustomer ? `/invoices?q=${encodeURIComponent(c.name)}` : `/bills?q=${encodeURIComponent(c.name)}`} className="block px-5 py-3 text-sm font-medium text-brand-600">
                  View all {(isCustomer ? docs : bills).length}
                </Link>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent loads"
            action={
              <LinkButton href={`/loads/new?${isCustomer ? "customer" : "subcontractor"}=${id}`} variant="secondary" size="sm">
                <Plus className="size-4" /> New
              </LinkButton>
            }
          />
          {loads.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">No loads yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {loads.map((l) => (
                <Row key={l.id} href={`/loads/${l.id}`} title={`${l.origin} → ${l.destination}`} subtitle={`${l.number} · ${fmtDate(l.pickupDate)}`} rightSub={<Badge tone={LOAD_STATUS[l.status].tone}>{LOAD_STATUS[l.status].label}</Badge>} />
              ))}
              {loadCount > loads.length && (
                <Link href={`/loads?q=${encodeURIComponent(c.name)}`} className="block px-5 py-3 text-sm font-medium text-brand-600">View all {loadCount}</Link>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <h2 className="text-[15px] font-semibold text-slate-900">Details</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail label="Contact person">{c.contactPerson}</Detail>
          <Detail label="Phone">{c.phone}</Detail>
          <Detail label="Email">{c.email}</Detail>
          <Detail label="VAT number">{c.vatNumber}</Detail>
          <Detail label="Registration no.">{c.regNumber}</Detail>
          <Detail label="Payment terms">{c.paymentTerms != null ? `${c.paymentTerms} days` : isCustomer ? `${company.paymentTermsDays} days (default)` : null}</Detail>
          <div className="col-span-2 sm:col-span-3"><Detail label="Address"><span className="whitespace-pre-line">{c.address}</span></Detail></div>
          {!isCustomer && (
            <>
              <Detail label="Bank">{c.bankName}</Detail>
              <Detail label="Account name">{c.bankAccountName}</Detail>
              <Detail label="Account number">{c.bankAccountNumber}</Detail>
              <Detail label="Branch code">{c.bankBranchCode}</Detail>
            </>
          )}
          {c.notes && <div className="col-span-2 sm:col-span-3"><Detail label="Notes"><span className="whitespace-pre-line">{c.notes}</span></Detail></div>}
        </dl>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton action={setContactArchived.bind(null, id, !c.archived)} variant="secondary" icon={c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}>
          {c.archived ? "Restore from archive" : "Archive"}
        </ActionButton>
        {isAdmin(user) && (
          <ConfirmAction
            label="Delete"
            icon={<Trash2 className="size-4" />}
            variant="dangerGhost"
            title={`Delete ${c.name}?`}
            message="This permanently removes the contact. Contacts with loads, invoices or payments cannot be deleted; archive them instead."
            confirmLabel="Delete"
            action={deleteContact.bind(null, id)}
          />
        )}
      </div>
    </>
  );
}

