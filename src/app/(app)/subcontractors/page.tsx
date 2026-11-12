import type { Metadata } from "next";
import { ContactList } from "@/components/contacts";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Subcontractors" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ContactList kind="SUBCONTRACTOR" searchParams={await searchParams} />;
}
