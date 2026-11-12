import type { DocumentView } from "@/lib/documents";
import { money } from "@/lib/format";

/**
 * The on-screen / printed invoice. Responsive on phones, A4 when printed.
 * The downloadable PDF (src/lib/pdf/document-pdf.tsx) mirrors this layout.
 */
export function DocumentPaper({ doc }: { doc: DocumentView }) {
  const m = (v: number) => money(v, doc.currency);
  const c = doc.company;
  const stamp = doc.rawStatus === "PAID" ? "PAID" : doc.rawStatus === "VOID" ? "VOID" : doc.rawStatus === "DRAFT" ? "DRAFT" : null;
  const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

  return (
    <article className="print-plain relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-card print:rounded-none" style={{ ["--accent" as string]: doc.accent }}>
      <div className="h-2 bg-[var(--accent)]" />
      <div className="p-5 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {c.logo ? (
              <img src={c.logo} alt={c.name} className="max-h-20 max-w-[200px] object-contain" />
            ) : (
              <div className="text-2xl font-bold tracking-tight">{c.tradingName || c.name}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold uppercase tracking-wide text-[var(--accent)] sm:text-3xl">{doc.title}</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">{doc.number}</div>
            {stamp && (
              <span className={`mt-2 inline-block rounded-md border-2 px-2.5 py-0.5 text-xs font-bold tracking-widest ${stamp === "PAID" ? "border-emerald-600 text-emerald-600" : "border-slate-400 text-slate-500"}`}>
                {stamp}
              </span>
            )}
          </div>
        </header>

        <section className="mt-8 grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">From</div>
            <div className="mt-1 font-semibold">{c.name}</div>
            <div className="text-slate-600">
              {c.address.map((l) => <div key={l}>{l}</div>)}
              {c.phone && <div>{c.phone}</div>}
              {c.email && <div className="break-all">{c.email}</div>}
              {c.regNumber && <div>Reg no: {c.regNumber}</div>}
              {c.vatNumber && <div>{doc.taxLabel} no: {c.vatNumber}</div>}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{doc.isInvoice ? "Bill to" : "Prepared for"}</div>
            <div className="mt-1 font-semibold">{doc.customer.name}</div>
            <div className="text-slate-600">
              {doc.customer.contactPerson && <div>Attn: {doc.customer.contactPerson}</div>}
              {doc.customer.address && <div className="whitespace-pre-line">{doc.customer.address}</div>}
              {doc.customer.vatNumber && <div>{doc.taxLabel} no: {doc.customer.vatNumber}</div>}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1 sm:justify-self-end">
            <dt className="text-slate-500">Date</dt>
            <dd className="text-right font-medium">{doc.issueDate}</dd>
            <dt className="text-slate-500">{doc.isInvoice ? "Due date" : "Valid until"}</dt>
            <dd className="text-right font-medium">{doc.dueDate}</dd>
            {doc.reference && (
              <>
                <dt className="text-slate-500">Reference</dt>
                <dd className="text-right font-medium break-all">{doc.reference}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="mt-8">
          <div className="hidden grid-cols-[1fr_4rem_7rem_4rem_7rem] gap-3 rounded-lg bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white sm:grid print:grid">
            <div>Description</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Unit price</div>
            <div className="text-right">{doc.showTax ? doc.taxLabel : ""}</div>
            <div className="text-right">Amount</div>
          </div>
          <div className="divide-y divide-slate-100 border-b border-slate-200">
            {doc.lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-1 py-3 text-sm sm:grid-cols-[1fr_4rem_7rem_4rem_7rem] sm:px-3 print:grid-cols-[1fr_4rem_7rem_4rem_7rem] print:px-3">
                <div className="whitespace-pre-line">{l.description}</div>
                <div className="tabular hidden text-right text-slate-600 sm:block print:block">{qty(l.quantity)}</div>
                <div className="tabular hidden text-right text-slate-600 sm:block print:block">{m(l.unitPrice)}</div>
                <div className="tabular hidden text-right text-slate-600 sm:block print:block">{doc.showTax ? `${l.taxRate}%` : ""}</div>
                <div className="tabular text-right font-medium">{m(l.amount)}</div>
                <div className="col-span-2 text-xs text-slate-500 sm:hidden print:hidden">
                  {qty(l.quantity)} × {m(l.unitPrice)}{doc.showTax ? ` · ${doc.taxLabel} ${l.taxRate}%` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between print:flex-row">
          <div className="order-2 min-w-0 flex-1 space-y-4 text-sm sm:order-1 print:order-1">
            {doc.isInvoice && c.bank && (
              <div className="rounded-xl bg-slate-50 p-4 print:border print:border-slate-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Banking details</div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  {c.bank.bankName && (<><dt className="text-slate-500">Bank</dt><dd className="font-medium">{c.bank.bankName}</dd></>)}
                  <dt className="text-slate-500">Account name</dt><dd className="font-medium">{c.bank.accountName}</dd>
                  <dt className="text-slate-500">Account no.</dt><dd className="tabular font-medium">{c.bank.accountNumber}</dd>
                  {c.bank.branchCode && (<><dt className="text-slate-500">Branch code</dt><dd className="tabular font-medium">{c.bank.branchCode}</dd></>)}
                  {c.bank.accountType && (<><dt className="text-slate-500">Account type</dt><dd className="font-medium">{c.bank.accountType}</dd></>)}
                  {c.bank.swift && (<><dt className="text-slate-500">SWIFT</dt><dd className="font-medium">{c.bank.swift}</dd></>)}
                  <dt className="text-slate-500">Reference</dt><dd className="font-medium">{doc.number}</dd>
                </dl>
              </div>
            )}
            {doc.notes && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{doc.isInvoice ? "Notes & terms" : "Terms"}</div>
                <p className="mt-1 whitespace-pre-line text-slate-600">{doc.notes}</p>
              </div>
            )}
          </div>
          <dl className="order-1 w-full space-y-1.5 text-sm sm:order-2 sm:w-72 print:order-2 print:w-72">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular">{m(doc.subtotal)}</dd></div>
            {doc.showTax && (
              <div className="flex justify-between">
                <dt className="text-slate-500">{doc.taxLabel}{doc.taxBreakdown.length === 1 ? ` (${doc.taxBreakdown[0].rate}%)` : ""}</dt>
                <dd className="tabular">{m(doc.taxTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold"><dt>Total</dt><dd className="tabular">{m(doc.total)}</dd></div>
            {doc.isInvoice && doc.amountPaid > 0 && (
              <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="tabular">− {m(doc.amountPaid)}</dd></div>
            )}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--accent)] px-4 py-3 text-white">
              <dt className="text-sm font-semibold">{doc.isInvoice ? "Balance due" : "Quote total"}</dt>
              <dd className="tabular text-lg font-bold">{m(doc.isInvoice ? doc.balance : doc.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          Thank you for your business{c.website ? ` · ${c.website}` : ""}
        </footer>
      </div>
    </article>
  );
}
