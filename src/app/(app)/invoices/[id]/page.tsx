import { DocDetail } from "@/components/documents";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DocDetail kind="INVOICE" id={(await params).id} />;
}
