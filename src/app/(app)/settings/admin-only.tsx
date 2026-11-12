import { isAdmin, requireUser } from "@/lib/auth";
import { Alert, PageHeader } from "@/components/ui";

/** Returns a notice to render instead of the page when the user is not an owner/admin. */
export async function adminGate(title: string) {
  const user = await requireUser();
  if (isAdmin(user)) return null;
  return (
    <>
      <PageHeader title={title} back={{ href: "/settings", label: "Settings" }} />
      <Alert tone="amber">Only an owner or admin can change these settings.</Alert>
    </>
  );
}
