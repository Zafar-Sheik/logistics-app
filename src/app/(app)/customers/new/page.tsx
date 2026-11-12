import { ContactFormPage } from "@/components/contacts";
import { one, type SearchParams } from "@/lib/params";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const returnTo = one((await searchParams).returnTo);
  return <ContactFormPage kind="CUSTOMER" returnTo={returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined} />;
}
