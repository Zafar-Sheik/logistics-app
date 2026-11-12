import type { Metadata } from "next";
import { getCompanyFresh } from "@/lib/auth";
import { saveBanking } from "@/actions/settings";
import { ActionForm, FormFooter, FormMessage, FormSection, SubmitButton, TextField } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { adminGate } from "../admin-only";

export const metadata: Metadata = { title: "Banking details" };

export default async function BankingSettingsPage() {
  const gate = await adminGate("Banking details");
  if (gate) return gate;
  const c = (await getCompanyFresh())!;
  return (
    <>
      <PageHeader title="Banking details" subtitle="Printed on every invoice and statement so customers know where to pay." back={{ href: "/settings", label: "Settings" }} />
      <ActionForm action={saveBanking} className="space-y-4">
        <FormSection title="Your business bank account">
          <TextField name="bankName" label="Bank" defaultValue={c.bankName ?? ""} optional placeholder="e.g. FNB, Standard Bank" />
          <TextField name="bankAccountName" label="Account name" defaultValue={c.bankAccountName ?? ""} optional placeholder={c.name} />
          <TextField name="bankAccountNumber" label="Account number" inputMode="numeric" defaultValue={c.bankAccountNumber ?? ""} optional hint="Banking details only show on invoices once this is filled in." />
          <TextField name="bankBranchCode" label="Branch code" inputMode="numeric" defaultValue={c.bankBranchCode ?? ""} optional />
          <TextField name="bankAccountType" label="Account type" defaultValue={c.bankAccountType ?? ""} optional placeholder="e.g. Business cheque" />
          <TextField name="bankSwift" label="SWIFT / BIC" defaultValue={c.bankSwift ?? ""} optional hint="Only needed for international customers." />
        </FormSection>
        <FormMessage />
        <FormFooter><SubmitButton>Save banking details</SubmitButton></FormFooter>
      </ActionForm>
    </>
  );
}
