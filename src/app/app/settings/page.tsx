import { getCurrentUser } from "@/lib/auth";
import { getAccessSummary } from "@/lib/access";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [access, { payment }] = await Promise.all([getAccessSummary(user.id), searchParams]);
  return (
    <div>
      <p className="eyebrow text-brand">Plan & settings</p>
      <h1 className="display mt-3 text-5xl tracking-[-.04em]">Your account, without the maze.</h1>
      <p className="mt-3 text-sm text-muted">Manage billing, see your access and control your study data.</p>
      <SettingsClient
        planLabel={access.planLabel}
        creditsRemaining={access.creditsRemaining}
        hasPro={access.hasPro}
        paymentSucceeded={payment === "success"}
      />
    </div>
  );
}
