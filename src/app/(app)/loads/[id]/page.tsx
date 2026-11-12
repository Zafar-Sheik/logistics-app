import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Ban, Check, CheckCircle2, FileText, MapPin, Pencil, Phone, Receipt, RotateCcw, Trash2, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getContactNames, nameOf } from "@/lib/lookups";
import { isAdmin, requireCompany, requireUser } from "@/lib/auth";
import { deleteLoad, setLoadStatus, setPodReceived } from "@/actions/loads";
import { Attachments } from "@/components/attachments";
import { ActionButton, ConfirmAction } from "@/components/sheet";
import { Badge, Card, CardHeader, Detail, LinkButton, PageHeader } from "@/components/ui";
import { billStatus, docStatus, LOAD_STATUS } from "@/lib/domain";
import { cx, fmtDate, money, num, todayISO } from "@/lib/format";

export default async function LoadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Everything is fetched side by side (one round trip), keyed on the load id.
  const [user, company, base, docs, bills, attachments, names] = await Promise.all([
    requireUser(),
    requireCompany(),
    db.load.findUnique({ where: { id } }),
    db.document.findMany({ where: { lines: { some: { loadId: id } } }, orderBy: { createdAt: "asc" } }),
    db.bill.findMany({ where: { loadId: id, status: { not: "VOID" } }, orderBy: { createdAt: "asc" } }),
    db.attachment.findMany({ where: { loadId: id }, select: { id: true, name: true, label: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    getContactNames(),
  ]);
  if (!base) notFound();
  const load = {
    ...base,
    bills,
    attachments,
    customer: { name: nameOf(names, base.customerId) },
    subcontractor: base.subcontractorId ? { name: nameOf(names, base.subcontractorId) } : null,
  };

  const cur = company.currency;
  const today = todayISO();
  const invoices = docs.filter((d) => d.kind === "INVOICE" && d.status !== "VOID");
  const quotes = docs.filter((d) => d.kind === "QUOTE");
  const invoice = invoices[0];
  const bill = load.bills[0];
  const cancelled = load.status === "CANCELLED";

  const delivered = load.status === "DELIVERED";
  const moving = load.status === "IN_TRANSIT" || delivered;
  const invoiced = !!invoice;
  const customerPaid = invoiced && invoices.every((d) => d.status === "PAID");
  const subPaid = load.bills.length > 0 && load.bills.every((b) => b.status === "PAID");
  const hasSub = !!load.subcontractor;

  const steps = [
    { label: "Booked", done: true },
    { label: "In transit", done: moving },
    { label: "Delivered", done: delivered },
    { label: "Invoiced", done: invoiced },
    { label: "Customer paid", done: customerPaid },
    ...(hasSub ? [{ label: "Sub paid", done: subPaid }] : []),
  ];
  const complete = steps.every((s) => s.done);

  const margin = num(load.customerRate) - num(load.subRate);
  const marginPct = num(load.customerRate) > 0 ? (margin / num(load.customerRate)) * 100 : 0;

  // One clear "what do I do next?" for this load.
  let next: { title: string; text: string; action: React.ReactNode } | null = null;
  if (cancelled) next = null;
  else if (load.status === "PLANNED")
    next = {
      title: "Has the truck collected?",
      text: "Update the status when the load is on the road, or go straight to delivered.",
      action: (
        <>
          <ActionButton action={setLoadStatus.bind(null, id, "IN_TRANSIT")} icon={<Truck className="size-4" />}>Mark in transit</ActionButton>
          <ActionButton action={setLoadStatus.bind(null, id, "DELIVERED")} variant="secondary" icon={<Check className="size-4" />}>Mark delivered</ActionButton>
        </>
      ),
    };
  else if (load.status === "IN_TRANSIT")
    next = {
      title: "On the road",
      text: "Mark the load as delivered once it has been offloaded.",
      action: <ActionButton action={setLoadStatus.bind(null, id, "DELIVERED")} icon={<Check className="size-4" />}>Mark delivered</ActionButton>,
    };
  else if (!invoiced)
    next = {
      title: "Delivered. Time to invoice",
      text: `Create the invoice for ${load.customer.name}. The route, reference and rate are filled in for you.`,
      action: <LinkButton href={`/invoices/new?load=${id}`}><FileText className="size-4" /> Create invoice</LinkButton>,
    };
  else if (invoice.status === "DRAFT")
    next = {
      title: "Invoice is still a draft",
      text: `Review ${invoice.number}, share it with the customer and mark it as sent.`,
      action: <LinkButton href={`/invoices/${invoice.id}`}>Open invoice <ArrowRight className="size-4" /></LinkButton>,
    };
  else if (!customerPaid)
    next = {
      title: "Waiting for the customer to pay",
      text: `When ${load.customer.name} pays ${invoice.number}, record the payment on the invoice.`,
      action: <LinkButton href={`/invoices/${invoice.id}`}>Record payment <ArrowRight className="size-4" /></LinkButton>,
    };
  else if (hasSub && !bill)
    next = {
      title: "Capture the subcontractor's bill",
      text: `Your customer has paid. Capture the invoice ${load.subcontractor!.name} sent you so you can pay them.`,
      action: <LinkButton href={`/bills/new?load=${id}`}><Receipt className="size-4" /> Capture bill</LinkButton>,
    };
  else if (hasSub && !subPaid)
    next = {
      title: "Ready to pay the subcontractor",
      text: `Your customer has paid, so it is safe to pay ${load.subcontractor!.name}.`,
      action: <LinkButton href={`/bills/${load.bills.find((b) => b.status !== "PAID")!.id}`} variant="success">Pay subcontractor <ArrowRight className="size-4" /></LinkButton>,
    };

  return (
    <>
      <PageHeader
        title={load.number}
        back={{ href: "/loads", label: "Loads" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={LOAD_STATUS[load.status].tone}>{LOAD_STATUS[load.status].label}</Badge>
            {load.origin} → {load.destination}
          </span>
        }
        actions={<LinkButton href={`/loads/${id}/edit`} variant="secondary"><Pencil className="size-4" /> Edit</LinkButton>}
      />

      {!cancelled && (
        <Card className="mb-4 overflow-hidden">
          <ol className="flex px-2 pt-4 pb-3 sm:px-5">
            {steps.map((s, i) => (
              <li key={s.label} className="flex min-w-0 flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={cx("h-0.5 flex-1", i === 0 ? "bg-transparent" : s.done ? "bg-emerald-500" : "bg-slate-200")} />
                  <span className={cx("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200")}>
                    {s.done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span className={cx("h-0.5 flex-1", i === steps.length - 1 ? "bg-transparent" : steps[i + 1].done ? "bg-emerald-500" : "bg-slate-200")} />
                </div>
                <span className={cx("mt-1.5 px-0.5 text-[10px] font-medium leading-tight sm:text-xs", s.done ? "text-slate-900" : "text-slate-400")}>{s.label}</span>
              </li>
            ))}
          </ol>
          {complete ? (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 sm:px-5">
              <CheckCircle2 className="size-5" /> All done. This load is complete.
            </div>
          ) : (
            next && (
              <div className="border-t border-slate-100 bg-brand-50/60 px-4 py-4 sm:px-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Next step</div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">{next.title}</div>
                <p className="mt-0.5 text-sm text-slate-600">{next.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">{next.action}</div>
              </div>
            )
          )}
        </Card>
      )}

      {cancelled && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-slate-600">This load was cancelled. It is left out of your reports.</p>
          <ActionButton action={setLoadStatus.bind(null, id, "PLANNED")} variant="secondary" icon={<RotateCcw className="size-4" />}>Reopen load</ActionButton>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4 sm:p-5">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="size-3 rounded-full border-2 border-brand-600 bg-white" />
                <span className="my-1 w-0.5 flex-1 bg-slate-200" />
                <MapPin className="size-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Pickup · {fmtDate(load.pickupDate)}</div>
                  <div className="text-[15px] font-semibold text-slate-900">{load.origin}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Delivery{load.deliveryDate ? ` · ${fmtDate(load.deliveryDate)}` : ""}</div>
                  <div className="text-[15px] font-semibold text-slate-900">{load.destination}</div>
                </div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <Detail label="Customer"><Link className="font-medium text-brand-700" href={`/customers/${load.customerId}`}>{load.customer.name}</Link></Detail>
              <Detail label="Customer ref / PO">{load.customerRef}</Detail>
              <Detail label="Cargo">{load.cargo}</Detail>
              <Detail label="Subcontractor">
                {load.subcontractor ? <Link className="font-medium text-brand-700" href={`/subcontractors/${load.subcontractorId}`}>{load.subcontractor.name}</Link> : "Own truck / not assigned"}
              </Detail>
              <Detail label="Truck">{load.vehicleReg}</Detail>
              <Detail label="Driver">
                {load.driverName}
                {load.driverPhone && (
                  <a href={`tel:${load.driverPhone}`} className="mt-0.5 flex items-center gap-1 font-medium text-brand-700"><Phone className="size-3.5" /> {load.driverPhone}</a>
                )}
              </Detail>
              {load.notes && <div className="col-span-2 sm:col-span-3"><Detail label="Notes"><span className="whitespace-pre-line">{load.notes}</span></Detail></div>}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Documents"
              subtitle={load.podReceived ? "Proof of delivery received" : "Proof of delivery not received yet"}
              action={
                <ActionButton action={setPodReceived.bind(null, id, !load.podReceived)} variant={load.podReceived ? "ghost" : "secondary"} size="sm" icon={load.podReceived ? <RotateCcw className="size-4" /> : <Check className="size-4" />}>
                  {load.podReceived ? "Undo POD" : "POD received"}
                </ActionButton>
              }
            />
            <Attachments loadId={id} items={load.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold text-slate-900">Money</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Customer pays you</dt><dd className="tabular font-medium">{money(load.customerRate, cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">You pay subcontractor</dt><dd className="tabular font-medium">− {money(load.subRate, cur)}</dd></div>
              <div className={cx("flex justify-between border-t border-slate-100 pt-2 text-base font-bold", margin < 0 ? "text-red-600" : "text-emerald-600")}>
                <dt>Margin</dt>
                <dd className="tabular">{money(margin, cur)} <span className="text-xs font-medium">({marginPct.toFixed(1)}%)</span></dd>
              </div>
            </dl>
            {company.taxRegistered && <p className="mt-2 text-xs text-slate-400">Amounts exclude {company.taxLabel}.</p>}
          </Card>

          <Card>
            <CardHeader title="Customer invoice" />
            <div className="px-4 pb-4 sm:px-5">
              {invoices.length === 0 ? (
                <>
                  <p className="text-sm text-slate-500">Not invoiced yet.</p>
                  {!cancelled && <LinkButton href={`/invoices/new?load=${id}`} variant="secondary" size="sm" className="mt-3"><FileText className="size-4" /> Create invoice</LinkButton>}
                </>
              ) : (
                invoices.map((d) => {
                  const s = docStatus(d, today);
                  return (
                    <Link key={d.id} href={`/invoices/${d.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                      <span><span className="block text-sm font-semibold text-slate-900">{d.number}</span><span className="text-xs text-slate-500">{money(d.total, cur)}</span></span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </Link>
                  );
                })
              )}
              {quotes.map((d) => (
                <Link key={d.id} href={`/quotes/${d.id}`} className="mt-2 block text-sm font-medium text-brand-700">Quote {d.number}</Link>
              ))}
            </div>
          </Card>

          {hasSub && (
            <Card>
              <CardHeader title="Subcontractor bill" />
              <div className="space-y-2 px-4 pb-4 sm:px-5">
                {load.bills.length === 0 && <p className="text-sm text-slate-500">No bill captured from {load.subcontractor!.name} yet.</p>}
                {load.bills.map((b) => {
                  const s = billStatus(b, today);
                  return (
                    <Link key={b.id} href={`/bills/${b.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                      <span><span className="block text-sm font-semibold text-slate-900">{b.number}</span><span className="text-xs text-slate-500">{money(b.total, cur)}</span></span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </Link>
                  );
                })}
                {!cancelled && <LinkButton href={`/bills/new?load=${id}`} variant="secondary" size="sm"><Receipt className="size-4" /> {load.bills.length ? "Add another bill" : "Capture bill"}</LinkButton>}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {load.status === "DELIVERED" && !invoiced && (
          <ActionButton action={setLoadStatus.bind(null, id, "IN_TRANSIT")} variant="ghost" icon={<RotateCcw className="size-4" />}>Undo delivered</ActionButton>
        )}
        {load.status === "IN_TRANSIT" && (
          <ActionButton action={setLoadStatus.bind(null, id, "PLANNED")} variant="ghost" icon={<RotateCcw className="size-4" />}>Back to booked</ActionButton>
        )}
        {!cancelled && (
          <ConfirmAction label="Cancel load" icon={<Ban className="size-4" />} variant="ghost" title={`Cancel ${load.number}?`} message="The load stays on record but is left out of your to-do lists and reports. You can reopen it later." confirmLabel="Cancel load" action={setLoadStatus.bind(null, id, "CANCELLED")} />
        )}
        {isAdmin(user) && (
          <ConfirmAction label="Delete" icon={<Trash2 className="size-4" />} variant="dangerGhost" title={`Delete ${load.number}?`} message="This permanently removes the load and its attached documents. Loads linked to an invoice or bill cannot be deleted." confirmLabel="Delete load" action={deleteLoad.bind(null, id)} />
        )}
      </div>
    </>
  );
}
