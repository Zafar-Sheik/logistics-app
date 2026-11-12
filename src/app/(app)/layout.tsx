import { requireCompany, requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { Tour } from "@/components/tour";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const company = await requireCompany();
  return (
    <Shell user={{ name: user.name, email: user.email, role: user.role }} companyName={company.tradingName || company.name} logo={company.logo}>
      {children}
      {!user.tutorialDone && <Tour />}
    </Shell>
  );
}
