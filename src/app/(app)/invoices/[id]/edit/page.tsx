import { DocFormPage } from "@/components/documents";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DocFormPage kind="INVOICE" id={(await params).id} />;
}
