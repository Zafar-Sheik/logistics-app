"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActionState } from "@/lib/action";
import { addDays, money } from "@/lib/format";
import { ActionForm, DateField, FormFooter, FormMessage, FormSection, MoneyField, SelectField, SubmitButton, TextAreaField, TextField } from "./form";
import { LinkButton } from "./ui";

type Sub = { id: string; name: string; terms: number };
type LoadOpt = { id: string; subcontractorId: string | null; label: string; rate: number };

export function BillForm({
  action,
  subs,
  loads,
  values,
  currency,
  symbol,
  taxLabel,
  companyTaxRate,
  cancelHref,
  isEdit,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  subs: Sub[];
  loads: LoadOpt[];
  values: { subcontractorId: string; loadId: string; number: string; issueDate: string; dueDate: string; subtotal: string; taxRate: string; notes: string };
  currency: string;
  symbol: string;
  taxLabel: string;
  companyTaxRate: number;
  cancelHref: string;
  isEdit: boolean;
}) {
  const [subId, setSubId] = useState(values.subcontractorId);
  const [loadId, setLoadId] = useState(values.loadId);
  const [subtotal, setSubtotal] = useState(values.subtotal);
  const [taxRate, setTaxRate] = useState(values.taxRate);
  const [issueDate, setIssueDate] = useState(values.issueDate);
  const [dueDate, setDueDate] = useState(values.dueDate);
  const [dueTouched, setDueTouched] = useState(isEdit);

  const termsFor = (id: string) => subs.find((s) => s.id === id)?.terms ?? 30;
  const subLoads = loads.filter((l) => l.subcontractorId === subId || l.id === values.loadId);
  const amount = Number(subtotal.replace(/[\s,]/g, "")) || 0;
  const tax = Math.round(amount * (Number(taxRate) || 0)) / 100;
  const rates = [...new Set(["0", String(companyTaxRate || 15), values.taxRate])].filter((r) => r !== "");

  return (
    <ActionForm action={action} className="space-y-4">
      <FormMessage />
      <FormSection title="Who sent you this invoice?">
        <SelectField
          name="subcontractorId"
          label="Subcontractor"
          value={subId}
          onChange={(e) => {
            setSubId(e.target.value);
            setLoadId("");
            if (!dueTouched) setDueDate(addDays(issueDate, termsFor(e.target.value)));
          }}
          placeholder="Choose a subcontractor"
          options={subs.map((s) => ({ value: s.id, label: s.name }))}
          hint={<>Not listed? <Link className="font-medium text-brand-600" href="/subcontractors/new?returnTo=/bills/new">Add a subcontractor</Link></>}
        />
        <SelectField
          name="loadId"
          label="For which load?"
          optional
          value={loadId}
          onChange={(e) => {
            setLoadId(e.target.value);
            const l = loads.find((x) => x.id === e.target.value);
            if (l && l.rate > 0 && !amount) setSubtotal(l.rate.toFixed(2));
          }}
          placeholder={subId ? (subLoads.length ? "Not linked to a load" : "No loads for this subcontractor") : "Choose a subcontractor first"}
          options={subLoads.map((l) => ({ value: l.id, label: l.label }))}
          hint="Linking the load lets Haulbook tell you when your customer has paid."
        />
      </FormSection>

      <FormSection title="Their invoice">
        <TextField name="number" label="Their invoice number" defaultValue={values.number} placeholder="As printed on their invoice" />
        <div className="hidden sm:block" />
        <DateField name="issueDate" label="Invoice date" value={issueDate} onChange={(e) => { setIssueDate(e.target.value); if (!dueTouched && e.target.value) setDueDate(addDays(e.target.value, termsFor(subId))); }} />
        <DateField name="dueDate" label="Pay by" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setDueTouched(true); }} />
        <MoneyField name="subtotal" label={`Amount (before ${taxLabel})`} prefix={symbol} value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
        <SelectField
          name="taxRate"
          label={`${taxLabel} on their invoice`}
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          options={rates.map((r) => ({ value: r, label: Number(r) === 0 ? `No ${taxLabel}` : `${taxLabel} ${Number(r)}%` }))}
          hint={`Choose “No ${taxLabel}” if they are not ${taxLabel} registered.`}
        />
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm sm:col-span-2">
          <span className="text-slate-600">Total you owe{tax > 0 ? ` (incl. ${money(tax, currency)} ${taxLabel})` : ""}</span>
          <span className="tabular text-base font-bold text-slate-900">{money(amount + tax, currency)}</span>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextAreaField name="notes" defaultValue={values.notes} wrapClass="sm:col-span-2" placeholder="Optional (private)" />
      </FormSection>

      <FormFooter>
        <LinkButton href={cancelHref} variant="ghost">Cancel</LinkButton>
        <SubmitButton>{isEdit ? "Save changes" : "Save bill"}</SubmitButton>
      </FormFooter>
    </ActionForm>
  );
}
