import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth";
import { saveCompany } from "@/actions/settings";
import { ActionForm, FormFooter, FormMessage, FormSection, SubmitButton, TextField } from "@/components/form";
import { LogoUploader } from "@/components/logo-uploader";
import { Card, PageHeader } from "@/components/ui";
import { adminGate } from "../admin-only";

export const metadata: Metadata = { title: "Company & logo" };

export default async function CompanySettingsPage() {
  const gate = await adminGate("Company & logo");
  if (gate) return gate;
  const c = await requireCompany();
  return (
    <>
      <PageHeader title="Company & logo" subtitle="These details appear on your invoices, quotes and statements." back={{ href: "/settings", label: "Settings" }} />
      <Card className="mb-4 p-4 sm:p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Logo</h2>
        <LogoUploader logo={c.logo} />
      </Card>
      <ActionForm action={saveCompany} className="space-y-4">
        <FormSection title="Company">
          <TextField name="name" label="Registered company name" defaultValue={c.name} wrapClass="sm:col-span-2" />
          <TextField name="tradingName" label="Trading name" defaultValue={c.tradingName ?? ""} optional hint="If different from the registered name." />
          <TextField name="regNumber" label="Company registration no." defaultValue={c.regNumber ?? ""} optional />
        </FormSection>
        <FormSection title="Contact details">
          <TextField name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={c.phone ?? ""} optional />
          <TextField name="email" label="Email" type="email" inputMode="email" autoCapitalize="none" defaultValue={c.email ?? ""} optional />
          <TextField name="website" label="Website" defaultValue={c.website ?? ""} optional autoCapitalize="none" wrapClass="sm:col-span-2" />
        </FormSection>
        <FormSection title="Address">
          <TextField name="addressLine1" label="Street address" defaultValue={c.addressLine1 ?? ""} optional wrapClass="sm:col-span-2" />
          <TextField name="addressLine2" label="Suburb / line 2" defaultValue={c.addressLine2 ?? ""} optional wrapClass="sm:col-span-2" />
          <TextField name="city" label="City" defaultValue={c.city ?? ""} optional />
          <TextField name="postalCode" label="Postal code" defaultValue={c.postalCode ?? ""} optional />
          <TextField name="province" label="Province / state" defaultValue={c.province ?? ""} optional />
          <TextField name="country" label="Country" defaultValue={c.country ?? ""} optional />
        </FormSection>
        <FormMessage />
        <FormFooter><SubmitButton>Save company details</SubmitButton></FormFooter>
      </ActionForm>
    </>
  );
}
