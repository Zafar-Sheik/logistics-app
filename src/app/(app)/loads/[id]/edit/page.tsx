import { LoadFormPage } from "../../form-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <LoadFormPage id={(await params).id} />;
}
