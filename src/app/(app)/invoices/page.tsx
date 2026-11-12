import type { Metadata } from "next";
import { DocList } from "@/components/documents";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Invoices" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  return <DocList kind="INVOICE" searchParams={await searchParams} />;
}
