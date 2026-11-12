"use client";

import { useState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action";
import { PAYMENT_METHODS } from "@/lib/domain";
import { ActionForm, DateField, FormMessage, MoneyField, SelectField, SubmitButton, TextField } from "./form";
import { Sheet } from "./sheet";
import { btn, type ButtonVariant } from "./ui";

/** "Record payment" button + sheet, used for both invoices (money in) and bills (money out). */
export function PaymentButton({
  action,
  label,
  title,
  balance,
  symbol,
  today,
  variant = "success",
  icon,
  note,
  block,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  label: string;
  title: string;
  balance: number;
  symbol: string;
  today: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  note?: string;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn({ variant, block })}>
        {icon}
        {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <ActionForm action={action} onSuccess={() => setOpen(false)} className="space-y-4">
          <FormMessage />
          {note && <p className="text-sm text-slate-500">{note}</p>}
          <MoneyField name="amount" label="Amount" prefix={symbol} defaultValue={balance.toFixed(2)} hint="Paid in part? Change the amount and record the rest later." />
          <div className="grid grid-cols-2 gap-3">
            <DateField name="date" label="Date" defaultValue={today} max={today} />
            <SelectField name="method" label="How" defaultValue="EFT" options={Object.entries(PAYMENT_METHODS).map(([value, l]) => ({ value, label: l }))} />
          </div>
          <TextField name="reference" label="Reference" optional placeholder="e.g. bank reference" />
          <SubmitButton block size="lg" variant={variant}>Save payment</SubmitButton>
        </ActionForm>
      </Sheet>
    </>
  );
}
