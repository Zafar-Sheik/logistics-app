import { ContactDetail } from "@/components/contacts";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ContactDetail kind="SUBCONTRACTOR" id={(await params).id} />;
}
