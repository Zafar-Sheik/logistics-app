"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
import { saveDocument } from "@/actions/documents";
import type { ActionState } from "@/lib/action";
import { calcTotals } from "@/lib/domain";
import { addDays, cx, money } from "@/lib/format";
import { ErrorList, inputClass } from "./form";
import { Sheet } from "./sheet";
import { Alert, btn, Card, LinkButton } from "./ui";

type Line = { key: string; description: string; quantity: string; unitPrice: string; taxed: boolean; taxRate: number; loadId: string | null };
type CustomerOpt = { id: string; name: string; terms: number };
type LoadOpt = { id: string; customerId: string; number: string; route: string; description: string; rate: number };

export type DocEditorProps = {
  kind: "INVOICE" | "QUOTE";
  id: string | null;
  customers: CustomerOpt[];
  loads: LoadOpt[];
  currency: string;
  symbol: string;
  taxLabel: string;
  taxRate: number;
  cancelHref: string;
  initial: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    reference: string;
    notes: string;
    lines: { description: string; quantity: number; unitPrice: number; taxRate: number; loadId: string | null }[];
  };
};

/** Line errors arrive as "lines.2.description"; say which line they belong to. */
function readable(errors?: Record<string, string>) {
  if (!errors) return errors;
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => {
    const m = k.match(/^lines\.(\d+)\./);
    return [k, m ? `Line ${Number(m[1]) + 1}: ${v}` : v];
  }));
}

let seq = 0;
const key = () => `l${++seq}`;
const toNum = (s: string) => Number(String(s).replace(/[\s,]/g, "")) || 0;

export function DocEditor(p: DocEditorProps) {
  const isInvoice = p.kind === "INVOICE";
  const noun = isInvoice ? "invoice" : "quote";
  const [customerId, setCustomerId] = useState(p.initial.customerId);
  const [issueDate, setIssueDate] = useState(p.initial.issueDate);
  const [dueDate, setDueDate] = useState(p.initial.dueDate);
  const [dueTouched, setDueTouched] = useState(!!p.id);
  const [reference, setReference] = useState(p.initial.reference);
  const [notes, setNotes] = useState(p.initial.notes);
  const [lines, setLines] = useState<Line[]>(() =>
    (p.initial.lines.length ? p.initial.lines : [{ description: "", quantity: 1, unitPrice: 0, taxRate: p.taxRate, loadId: null }]).map((l) => ({
      key: key(),
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: l.unitPrice ? l.unitPrice.toFixed(2) : "",
      taxed: l.taxRate > 0,
      taxRate: l.taxRate > 0 ? l.taxRate : p.taxRate,
      loadId: l.loadId,
    })),
  );
  const [picker, setPicker] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();

  const termsFor = (cid: string) => (isInvoice ? p.customers.find((c) => c.id === cid)?.terms ?? 30 : 30);
  const totals = useMemo(
    () => calcTotals(lines.map((l) => ({ description: l.description, quantity: toNum(l.quantity), unitPrice: toNum(l.unitPrice), taxRate: l.taxed ? l.taxRate : 0 }))),
    [lines],
  );
  const usedLoads = new Set(lines.map((l) => l.loadId).filter(Boolean));
  const availableLoads = p.loads.filter((l) => l.customerId === customerId && !usedLoads.has(l.id));
  const m = (v: number) => money(v, p.currency);
  const err = (k: string) => state?.fieldErrors?.[k];

  const update = (k: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));

  function changeCustomer(cid: string) {
    setCustomerId(cid);
    // Loads belong to one customer, so drop linked lines when the customer changes.
    setLines((ls) => {
      const kept = ls.filter((l) => !l.loadId);
      return kept.length ? kept : [{ key: key(), description: "", quantity: "1", unitPrice: "", taxed: p.taxRate > 0, taxRate: p.taxRate, loadId: null }];
    });
    if (!dueTouched) setDueDate(addDays(issueDate, termsFor(cid)));
  }

  function addLoad(l: LoadOpt) {
    setLines((ls) => {
      const blankless = ls.filter((x) => x.description.trim() || toNum(x.unitPrice) > 0);
      return [...blankless, { key: key(), description: l.description, quantity: "1", unitPrice: l.rate.toFixed(2), taxed: p.taxRate > 0, taxRate: p.taxRate, loadId: l.id }];
    });
  }

  function submit() {
    setState(null);
    start(async () => {
      const res = await saveDocument(
        p.kind,
        p.id,
        {
          customerId,
          issueDate,
          dueDate,
          reference,
          notes,
          lines: lines
            .filter((l) => l.description.trim() || toNum(l.unitPrice) > 0)
            .map((l) => ({ description: l.description, quantity: toNum(l.quantity), unitPrice: toNum(l.unitPrice), taxRate: l.taxed ? l.taxRate : 0, loadId: l.loadId })),
        },
        false,
      );
      if (res?.error) {
        setState(res);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const label = "mb-1.5 block text-sm font-medium text-slate-700";
  return (
    <div className="space-y-4">
      {state?.error && <Alert>{state.error}<ErrorList fieldErrors={readable(state.fieldErrors)} /></Alert>}

      <Card className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="doc-customer">Customer</label>
          <select id="doc-customer" className={inputClass} value={customerId} onChange={(e) => changeCustomer(e.target.value)} aria-invalid={!!err("customerId")}>
            <option value="">Choose a customer</option>
            {p.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {err("customerId") ? <p className="mt-1.5 text-sm text-red-600">{err("customerId")}</p> : (
            <p className="mt-1.5 text-xs text-slate-500">Not listed? <Link className="font-medium text-brand-600" href={`/customers/new?returnTo=/${noun}s/new`}>Add a customer</Link></p>
          )}
        </div>
        <div>
          <label className={label} htmlFor="doc-date">{isInvoice ? "Invoice date" : "Quote date"}</label>
          <input id="doc-date" type="date" className={inputClass} value={issueDate} aria-invalid={!!err("issueDate")}
            onChange={(e) => { setIssueDate(e.target.value); if (!dueTouched && e.target.value) setDueDate(addDays(e.target.value, termsFor(customerId))); }} />
        </div>
        <div>
          <label className={label} htmlFor="doc-due">{isInvoice ? "Due date" : "Valid until"}</label>
          <input id="doc-due" type="date" className={inputClass} value={dueDate} aria-invalid={!!err("dueDate")} onChange={(e) => { setDueDate(e.target.value); setDueTouched(true); }} />
          {err("dueDate") && <p className="mt-1.5 text-sm text-red-600">{err("dueDate")}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="doc-ref">Customer reference / PO <span className="float-right text-xs font-normal text-slate-400">Optional</span></label>
          <input id="doc-ref" className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-slate-900">What are you charging for?</h2>
          {isInvoice && customerId && availableLoads.length > 0 && (
            <button type="button" onClick={() => setPicker(true)} className={btn({ variant: "secondary", size: "sm" })}>
              <Package className="size-4" /> Add loads ({availableLoads.length})
            </button>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {lines.map((l, i) => {
            const amount = toNum(l.quantity) * toNum(l.unitPrice);
            return (
              <div key={l.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-start gap-2">
                  <textarea
                    aria-label={`Line ${i + 1} description`}
                    rows={2}
                    placeholder="Description, e.g. Transport: Durban to Johannesburg"
                    className={cx(inputClass, "h-auto min-h-[4.25rem] py-2.5 [field-sizing:content]")}
                    value={l.description}
                    aria-invalid={!!err(`lines.${i}.description`)}
                    onChange={(e) => update(l.key, { description: e.target.value })}
                  />
                  <button type="button" aria-label={`Remove line ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {l.loadId && <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"><Package className="size-3" /> Linked to a load</div>}
                <div className="mt-2 grid grid-cols-[5rem_1fr] items-end gap-2 sm:grid-cols-[6rem_10rem_1fr_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Qty</label>
                    <input inputMode="decimal" className={cx(inputClass, "tabular")} value={l.quantity} aria-invalid={!!err(`lines.${i}.quantity`)} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Price each ({p.symbol})</label>
                    <input inputMode="decimal" placeholder="0.00" className={cx(inputClass, "tabular")} value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-2">
                    {p.taxRate > 0 || l.taxed ? (
                      <label className="flex h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="size-5 rounded accent-brand-600" checked={l.taxed} onChange={(e) => update(l.key, { taxed: e.target.checked })} />
                        {p.taxLabel} {l.taxRate}%
                      </label>
                    ) : <span />}
                    <div className="tabular text-right text-sm font-semibold text-slate-900">{m(amount)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={() => setLines((ls) => [...ls, { key: key(), description: "", quantity: "1", unitPrice: "", taxed: p.taxRate > 0, taxRate: p.taxRate, loadId: null }])}
          className={btn({ variant: "secondary", block: true }, "mt-3 border-dashed")}>
          <Plus className="size-4" /> Add a line
        </button>

        <dl className="mt-5 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular">{m(totals.subtotal)}</dd></div>
          {(p.taxRate > 0 || totals.taxTotal > 0) && <div className="flex justify-between"><dt className="text-slate-500">{p.taxLabel}</dt><dd className="tabular">{m(totals.taxTotal)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular">{m(totals.total)}</dd></div>
        </dl>
      </Card>

      <Card className="p-4 sm:p-5">
        <label className={label} htmlFor="doc-notes">Notes &amp; terms <span className="float-right text-xs font-normal text-slate-400">Shown on the {noun}</span></label>
        <textarea id="doc-notes" rows={3} className={cx(inputClass, "h-auto py-2.5")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Card>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
        <div>
          <div className="text-xs text-slate-500">Total</div>
          <div className="tabular text-lg font-bold text-slate-900">{m(totals.total)}</div>
        </div>
        <div className="flex gap-2">
          <LinkButton href={p.cancelHref} variant="ghost">Cancel</LinkButton>
          <button type="button" disabled={pending} onClick={submit} className={btn()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {p.id ? "Save changes" : `Save ${noun}`}
          </button>
        </div>
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Add delivered loads">
        <p className="mb-3 text-sm text-slate-500">Delivered loads for this customer that have not been invoiced yet.</p>
        <div className="space-y-2">
          {availableLoads.map((l) => (
            <button key={l.id} type="button" onClick={() => addLoad(l)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{l.route}</span>
                <span className="text-xs text-slate-500">{l.number}</span>
              </span>
              <span className="tabular shrink-0 text-sm font-semibold">{m(l.rate)}</span>
            </button>
          ))}
          {availableLoads.length === 0 && <p className="py-6 text-center text-sm text-slate-500">All loads have been added.</p>}
        </div>
        <button type="button" onClick={() => setPicker(false)} className={btn({ block: true }, "mt-4")}>Done</button>
      </Sheet>
    </div>
  );
}
