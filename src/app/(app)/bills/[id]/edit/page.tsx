import { BillFormPage } from "../../form-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BillFormPage id={(await params).id} />;
}
