"use client";

import { useState } from "react";
import { setupAction } from "@/actions/auth";
import { ActionForm, CheckboxField, FormMessage, SelectField, SubmitButton, TextField } from "@/components/form";
import { CURRENCIES } from "@/lib/format";

export function SetupForm() {
  const [taxRegistered, setTaxRegistered] = useState(true);
  return (
    <ActionForm action={setupAction} className="mt-5 space-y-6">
      <FormMessage />
      <fieldset className="space-y-4">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">1 · Your sign-in</legend>
        <TextField name="userName" label="Your name" autoComplete="name" required />
        <TextField name="email" label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" required />
        <TextField name="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." required />
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">2 · Your company</legend>
        <TextField name="companyName" label="Company name" hint="Shown on your invoices and quotes." required />
        <TextField name="phone" label="Phone" type="tel" inputMode="tel" optional />
        <SelectField
          name="currency"
          label="Currency"
          defaultValue="ZAR"
          options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${code} — ${c.name}` }))}
        />
        <CheckboxField name="taxRegistered" label="We are VAT / tax registered" hint="Adds tax to invoices and tracks it for your returns." defaultChecked onChange={setTaxRegistered} />
        {taxRegistered && (
          <div className="grid grid-cols-2 gap-4">
            <TextField name="vatNumber" label="VAT number" optional />
            <TextField name="taxRate" label="Tax rate %" inputMode="decimal" defaultValue="15" />
          </div>
        )}
        {!taxRegistered && <input type="hidden" name="taxRate" value="0" />}
      </fieldset>
      <SubmitButton block size="lg">Create my workspace</SubmitButton>
      <p className="text-center text-xs text-slate-500">You can add your logo, address and banking details next.</p>
    </ActionForm>
  );
}
