import { ContactDetail } from "@/components/contacts";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ContactDetail kind="CUSTOMER" id={(await params).id} />;
}
