import type { Metadata } from "next";
import { one, type SearchParams } from "@/lib/params";
import { LoadFormPage } from "../form-page";

export const metadata: Metadata = { title: "New load" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <LoadFormPage preset={{ customer: one(sp.customer), subcontractor: one(sp.subcontractor) }} />;
}
