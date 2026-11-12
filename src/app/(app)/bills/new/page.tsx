import type { Metadata } from "next";
import { one, type SearchParams } from "@/lib/params";
import { BillFormPage } from "../form-page";

export const metadata: Metadata = { title: "New bill" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <BillFormPage preset={{ load: one(sp.load), subcontractor: one(sp.subcontractor) }} />;
}
