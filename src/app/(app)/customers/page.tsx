import type { Metadata } from "next";
import { ContactList } from "@/components/contacts";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Customers" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ContactList kind="CUSTOMER" searchParams={await searchParams} />;
}
