"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { cx, money } from "@/lib/format";
import { ActionForm, DateField, FormFooter, FormMessage, FormSection, MoneyField, SelectField, SubmitButton, TextAreaField, TextField } from "./form";
import { LinkButton } from "./ui";

type Option = { id: string; name: string };
export type LoadFormValues = {
  customerId: string;
  subcontractorId: string;
  customerRef: string;
  origin: string;
  destination: string;
  pickupDate: string;
  deliveryDate: string;
  cargo: string;
  vehicleReg: string;
  driverName: string;
  driverPhone: string;
  customerRate: string;
  subRate: string;
  notes: string;
};

const toNum = (s: string) => Number(s.replace(/[\s,]/g, "")) || 0;

export function LoadForm({
  action,
  customers,
  subcontractors,
  values,
  currency,
  symbol,
  taxLabel,
  cancelHref,
  isEdit,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  customers: Option[];
  subcontractors: Option[];
  values: LoadFormValues;
  currency: string;
  symbol: string;
  taxLabel: string | null;
  cancelHref: string;
  isEdit: boolean;
}) {
  const [customerRate, setCustomerRate] = useState(values.customerRate);
  const [subRate, setSubRate] = useState(values.subRate);
  const margin = toNum(customerRate) - toNum(subRate);
  const pct = toNum(customerRate) > 0 ? (margin / toNum(customerRate)) * 100 : 0;
  const exTax = taxLabel ? `Excluding ${taxLabel}.` : undefined;

  return (
    <ActionForm action={action} className="space-y-4">
      <FormMessage />
      <FormSection title="Who is it for?">
        <SelectField
          name="customerId"
          label="Customer"
          defaultValue={values.customerId}
          placeholder="Choose a customer"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
          hint={<>Not listed? <Link className="font-medium text-brand-600" href="/customers/new?returnTo=/loads/new">Add a customer</Link></>}
        />
        <TextField name="customerRef" label="Customer reference / PO" defaultValue={values.customerRef} optional />
      </FormSection>

      <FormSection title="Route">
        <TextField name="origin" label="Pickup from" placeholder="e.g. Durban Harbour" defaultValue={values.origin} />
        <TextField name="destination" label="Deliver to" placeholder="e.g. City Deep, Johannesburg" defaultValue={values.destination} />
        <DateField name="pickupDate" label="Pickup date" defaultValue={values.pickupDate} />
        <DateField name="deliveryDate" label="Delivery date" defaultValue={values.deliveryDate} optional />
        <TextField name="cargo" label="What is being moved?" placeholder="e.g. 34t maize, 1 × 12m container" defaultValue={values.cargo} optional wrapClass="sm:col-span-2" />
      </FormSection>

      <FormSection title="Who is carrying it?" description="Leave blank if you are moving this load with your own truck.">
        <SelectField
          name="subcontractorId"
          label="Subcontractor"
          defaultValue={values.subcontractorId}
          placeholder="Own truck / not assigned yet"
          options={subcontractors.map((c) => ({ value: c.id, label: c.name }))}
          hint={<>Not listed? <Link className="font-medium text-brand-600" href="/subcontractors/new?returnTo=/loads/new">Add a subcontractor</Link></>}
          wrapClass="sm:col-span-2"
        />
        <TextField name="vehicleReg" label="Truck registration" defaultValue={values.vehicleReg} optional autoCapitalize="characters" />
        <TextField name="driverName" label="Driver name" defaultValue={values.driverName} optional />
        <TextField name="driverPhone" label="Driver phone" type="tel" inputMode="tel" defaultValue={values.driverPhone} optional />
      </FormSection>

      <FormSection title="Money">
        <MoneyField name="customerRate" label="You charge the customer" prefix={symbol} value={customerRate} onChange={(e) => setCustomerRate(e.target.value)} hint={exTax} />
        <MoneyField name="subRate" label="You pay the subcontractor" prefix={symbol} value={subRate} onChange={(e) => setSubRate(e.target.value)} hint={exTax} />
        <div className={cx("flex items-center gap-3 rounded-xl px-4 py-3 sm:col-span-2", margin < 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800")}>
          <TrendingUp className="size-5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Your margin: {money(margin, currency)}</span>
            {toNum(customerRate) > 0 && <span> ({pct.toFixed(1)}%)</span>}
            {margin < 0 && <span className="block text-xs">You are paying more than you are charging.</span>}
          </div>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextAreaField name="notes" defaultValue={values.notes} wrapClass="sm:col-span-2" placeholder="Special instructions, gate passes, contact on site… (private)" />
      </FormSection>

      <FormFooter>
        <LinkButton href={cancelHref} variant="ghost">Cancel</LinkButton>
        <SubmitButton>{isEdit ? "Save changes" : "Save load"}</SubmitButton>
      </FormFooter>
    </ActionForm>
  );
}
