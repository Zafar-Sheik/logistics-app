import { DocFormPage } from "@/components/documents";
import { one, type SearchParams } from "@/lib/params";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <DocFormPage kind="QUOTE" preset={{ load: one(sp.load), customer: one(sp.customer) }} />;
}
