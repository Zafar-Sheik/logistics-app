import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth";
import { saveDocumentSettings } from "@/actions/settings";
import { ActionForm, CheckboxField, FormFooter, FormMessage, FormSection, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { CURRENCIES, num } from "@/lib/format";
import { adminGate } from "../admin-only";

export const metadata: Metadata = { title: "Invoice settings" };

export default async function DocumentSettingsPage() {
  const gate = await adminGate("Invoice settings");
  if (gate) return gate;
  const c = await requireCompany();
  return (
    <>
      <PageHeader title="Invoice settings" subtitle="Tax, numbering and wording for invoices and quotes." back={{ href: "/settings", label: "Settings" }} />
      <ActionForm action={saveDocumentSettings} className="space-y-4">
        <FormSection title="Currency & tax">
          <SelectField name="currency" label="Currency" defaultValue={c.currency} options={Object.entries(CURRENCIES).map(([code, x]) => ({ value: code, label: `${code} — ${x.name}` }))} />
          <TextField name="vatNumber" label="Your VAT / tax number" defaultValue={c.vatNumber ?? ""} optional />
          <div className="sm:col-span-2">
            <CheckboxField name="taxRegistered" label="We are VAT / tax registered" hint="When ticked, tax is added to new invoice lines and documents are titled “Tax Invoice”." defaultChecked={c.taxRegistered} />
          </div>
          <TextField name="taxLabel" label="Tax name" defaultValue={c.taxLabel} hint="VAT, GST, Sales tax…" />
          <TextField name="taxRate" label="Tax rate %" inputMode="decimal" defaultValue={String(num(c.taxRate))} />
        </FormSection>
        <FormSection title="Numbering" description="Moving from another system? Set the next number so your sequence carries on.">
          <TextField name="invoicePrefix" label="Invoice prefix" defaultValue={c.invoicePrefix} />
          <TextField name="invoiceNext" label="Next invoice number" inputMode="numeric" defaultValue={c.invoiceNext} />
          <TextField name="quotePrefix" label="Quote prefix" defaultValue={c.quotePrefix} />
          <TextField name="quoteNext" label="Next quote number" inputMode="numeric" defaultValue={c.quoteNext} />
          <TextField name="loadPrefix" label="Load prefix" defaultValue={c.loadPrefix} />
          <TextField name="loadNext" label="Next load number" inputMode="numeric" defaultValue={c.loadNext} />
        </FormSection>
        <FormSection title="Terms & wording">
          <TextField name="paymentTermsDays" label="Default payment terms (days)" inputMode="numeric" defaultValue={c.paymentTermsDays} hint="Sets the due date on new invoices. Can be overridden per customer." />
          <TextField name="accentColor" label="Invoice colour" type="color" defaultValue={c.accentColor} className="p-1.5" hint="Used for headings and the total on your documents." />
          <TextAreaField name="invoiceNotes" label="Default invoice notes & terms" defaultValue={c.invoiceNotes ?? ""} optional wrapClass="sm:col-span-2" placeholder="e.g. Payment strictly within 30 days. Please use the invoice number as your payment reference." />
          <TextAreaField name="quoteNotes" label="Default quote terms" defaultValue={c.quoteNotes ?? ""} optional wrapClass="sm:col-span-2" placeholder="e.g. Rates valid for 30 days. Subject to truck availability." />
        </FormSection>
        <FormMessage />
        <FormFooter><SubmitButton>Save invoice settings</SubmitButton></FormFooter>
      </ActionForm>
    </>
  );
}
