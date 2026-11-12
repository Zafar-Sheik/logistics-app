import type { Metadata } from "next";
import { DocList } from "@/components/documents";
import type { SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Quotes" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  return <DocList kind="QUOTE" searchParams={await searchParams} />;
}
