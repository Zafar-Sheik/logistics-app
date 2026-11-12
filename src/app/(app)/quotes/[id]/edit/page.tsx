import { DocFormPage } from "@/components/documents";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DocFormPage kind="QUOTE" id={(await params).id} />;
}
