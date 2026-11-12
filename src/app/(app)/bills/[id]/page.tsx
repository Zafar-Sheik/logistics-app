import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Ban, Banknote, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { isAdmin, requireCompany, requireUser } from "@/lib/auth";
import { deleteBill, deletePayment, recordBillPayment, voidBill } from "@/actions/money";
import { PaymentButton } from "@/components/payment-form";
import { ConfirmAction } from "@/components/sheet";
import { Badge, Card, Detail, LinkButton, PageHeader } from "@/components/ui";
import { balanceOf, billStatus, PAYMENT_METHODS } from "@/lib/domain";
import { CURRENCIES, fmtDate, money, num, todayISO } from "@/lib/format";

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // All lookups run side by side (one round trip), using relation filters on the bill id.
  const [user, company, base, sub, payments, load, invoices] = await Promise.all([
    requireUser(),
    requireCompany(),
    db.bill.findUnique({ where: { id } }),
    db.contact.findFirst({ where: { bills: { some: { id } } } }),
    db.payment.findMany({ where: { billId: id }, orderBy: { date: "asc" } }),
    db.load.findFirst({ where: { bills: { some: { id } } } }),
    db.document.findMany({ where: { kind: "INVOICE", status: { not: "VOID" }, lines: { some: { load: { bills: { some: { id } } } } } } }),
  ]);
  if (!base || !sub) notFound();
  const bill = { ...base, payments, load };

  const cur = company.currency;
  const today = todayISO();
  const s = billStatus(bill, today);
  const balance = balanceOf(bill);
  const admin = isAdmin(user);
  const customerPaid = invoices.length > 0 && invoices.every((d) => d.status === "PAID");
  const open = bill.status === "OPEN";

  return (
    <>
      <PageHeader
        title={`Bill ${bill.number}`}
        back={{ href: "/bills", label: "Bills" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={s.tone}>{s.label}</Badge>
            <Link href={`/subcontractors/${sub.id}`} className="font-medium text-brand-700">{sub.name}</Link>
          </span>
        }
        actions={bill.status !== "VOID" && <LinkButton href={`/bills/${id}/edit`} variant="secondary"><Pencil className="size-4" /> Edit</LinkButton>}
      />

      {open && bill.load && (
        customerPaid ? (
          <Card className="mb-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm"><b>Your customer has paid for this load.</b> It is safe to pay {sub.name}.</div>
          </Card>
        ) : (
          <Card className="mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <b>Your customer has not paid for this load yet.</b>{" "}
              {invoices.length === 0 ? (
                <>The load has not been invoiced. <Link className="font-semibold underline" href={`/loads/${bill.load.id}`}>Open load</Link></>
              ) : (
                <>Waiting on {invoices.filter((d) => d.status !== "PAID").map((d, i) => (<span key={d.id}>{i > 0 && ", "}<Link className="font-semibold underline" href={`/invoices/${d.id}`}>{d.number}</Link></span>))}. You can still pay now if you choose to.</>
              )}
            </div>
          </Card>
        )
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{bill.status === "PAID" ? "Paid in full" : bill.status === "VOID" ? "Void" : "You still owe"}</div>
                <div className={`tabular text-2xl font-bold ${bill.status === "PAID" ? "text-emerald-600" : "text-slate-900"}`}>{money(bill.status === "OPEN" ? balance : bill.total, cur)}</div>
                {open && <div className="text-xs text-slate-500">of {money(bill.total, cur)} · pay by {fmtDate(bill.dueDate)}</div>}
              </div>
              {open && balance > 0 && (
                <PaymentButton action={recordBillPayment.bind(null, id)} label="Record payment" title={`Pay ${sub.name}`} balance={balance} symbol={CURRENCIES[cur]?.symbol ?? cur} today={today} icon={<Banknote className="size-4" />} note="Record this after you have made the payment from your bank." />
              )}
            </div>
            {bill.payments.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {bill.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">{fmtDate(p.date)}</span>
                      <span className="block truncate text-xs text-slate-500">{PAYMENT_METHODS[p.method]}{p.reference ? ` · ${p.reference}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="tabular font-semibold text-slate-900">{money(p.amount, cur)}</span>
                      {admin && <ConfirmAction label={<span className="sr-only">Delete payment</span>} icon={<Trash2 className="size-4" />} variant="ghost" size="sm" title="Delete this payment?" message={`This removes the ${money(p.amount, cur)} payment and re-opens the balance on this bill.`} confirmLabel="Delete payment" action={deletePayment.bind(null, p.id)} />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold text-slate-900">Bill details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Detail label="Their invoice no.">{bill.number}</Detail>
              <Detail label="Invoice date">{fmtDate(bill.issueDate)}</Detail>
              <Detail label="Pay by">{fmtDate(bill.dueDate)}</Detail>
              <Detail label="Amount">{money(bill.subtotal, cur)}</Detail>
              <Detail label={company.taxLabel}>{money(bill.taxTotal, cur)}</Detail>
              <Detail label="Total">{money(bill.total, cur)}</Detail>
              <Detail label="Load">{bill.load ? <Link href={`/loads/${bill.load.id}`} className="font-medium text-brand-700">{bill.load.number} · {bill.load.origin} → {bill.load.destination}</Link> : "Not linked"}</Detail>
              {bill.notes && <div className="col-span-2 sm:col-span-3"><Detail label="Notes"><span className="whitespace-pre-line">{bill.notes}</span></Detail></div>}
            </dl>
          </Card>
        </div>

        <Card className="h-fit p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-slate-900">Pay into</h2>
          {sub.bankAccountNumber ? (
            <dl className="mt-3 space-y-3">
              <Detail label="Bank">{sub.bankName}</Detail>
              <Detail label="Account name">{sub.bankAccountName || sub.name}</Detail>
              <Detail label="Account number"><span className="tabular select-all font-semibold">{sub.bankAccountNumber}</span></Detail>
              <Detail label="Branch code"><span className="tabular select-all">{sub.bankBranchCode}</span></Detail>
              <Detail label="Use reference"><span className="select-all">{bill.number}</span></Detail>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No banking details saved for {sub.name}. <Link href={`/subcontractors/${sub.id}/edit`} className="font-medium text-brand-700">Add them</Link> so they are on hand when you pay.
            </p>
          )}
        </Card>
      </div>

      {admin && num(bill.amountPaid) === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {open && <ConfirmAction label="Void bill" icon={<Ban className="size-4" />} variant="ghost" title="Void this bill?" message="The bill stays on record but no longer counts as money you owe." confirmLabel="Void bill" action={voidBill.bind(null, id)} />}
          <ConfirmAction label="Delete" icon={<Trash2 className="size-4" />} variant="dangerGhost" title="Delete this bill?" message="This permanently removes the bill. Use this for bills captured by mistake." confirmLabel="Delete bill" action={deleteBill.bind(null, id)} />
        </div>
      )}
    </>
  );
}
