import { ExpenseFormPage } from "../../form-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ExpenseFormPage id={(await params).id} />;
}
