"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/action";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/domain";
import { ActionForm, CheckboxField, DateField, FormFooter, FormMessage, FormSection, MoneyField, SelectField, SubmitButton, TextField } from "./form";
import { LinkButton } from "./ui";

export function ExpenseForm({
  action,
  values,
  symbol,
  taxLabel,
  taxRate,
  today,
  isEdit,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values: { date: string; category: string; vendor: string; description: string; amount: string; taxAmount: string; method: string; reference: string };
  symbol: string;
  taxLabel: string;
  taxRate: number;
  today: string;
  isEdit: boolean;
}) {
  const [amount, setAmount] = useState(values.amount);
  const [tax, setTax] = useState(values.taxAmount);
  const [hasTax, setHasTax] = useState(Number(values.taxAmount) > 0);
  const calc = (a: string) => {
    const n = Number(a.replace(/[\s,]/g, "")) || 0;
    return n > 0 ? ((n * taxRate) / (100 + taxRate)).toFixed(2) : "";
  };

  return (
    <ActionForm action={action} className="space-y-4">
      <FormMessage />
      <FormSection title="What did you spend on?">
        <SelectField name="category" label="Category" defaultValue={values.category} placeholder="Choose a category" options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <DateField name="date" label="Date" defaultValue={values.date} max={today} />
        <TextField name="vendor" label="Paid to" defaultValue={values.vendor} optional placeholder="e.g. Engen, Telkom" />
        <TextField name="description" label="Description" defaultValue={values.description} optional />
      </FormSection>
      <FormSection title="How much?">
        <MoneyField
          name="amount"
          label={taxRate > 0 ? `Total paid (incl. ${taxLabel})` : "Total paid"}
          prefix={symbol}
          value={amount}
          onChange={(e) => { setAmount(e.target.value); if (hasTax) setTax(calc(e.target.value)); }}
        />
        <SelectField name="method" label="Paid by" defaultValue={values.method} options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />
        {taxRate > 0 && (
          <div className="sm:col-span-2">
            <CheckboxField name="_hasTax" label={`This includes ${taxLabel}`} hint={`Tick if you have a valid tax invoice, so the ${taxLabel} can be claimed back.`} defaultChecked={hasTax} onChange={(c) => { setHasTax(c); setTax(c ? calc(amount) : ""); }} />
          </div>
        )}
        {hasTax && taxRate > 0 ? (
          <MoneyField name="taxAmount" label={`${taxLabel} amount`} prefix={symbol} value={tax} onChange={(e) => setTax(e.target.value)} hint={`Worked out at ${taxRate}%. Change it if the slip shows a different amount.`} />
        ) : (
          <input type="hidden" name="taxAmount" value="0" />
        )}
        <TextField name="reference" label="Slip / reference no." defaultValue={values.reference} optional />
      </FormSection>
      <FormFooter>
        <LinkButton href="/expenses" variant="ghost">Cancel</LinkButton>
        <SubmitButton>{isEdit ? "Save changes" : "Save expense"}</SubmitButton>
      </FormFooter>
    </ActionForm>
  );
}
