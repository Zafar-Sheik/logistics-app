import { ContactFormPage } from "@/components/contacts";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ContactFormPage kind="CUSTOMER" id={(await params).id} />;
}
