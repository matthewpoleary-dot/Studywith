import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId || user.id !== adminUserId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // ── Total users ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalUsers } = await (admin.from("users") as any)
    .select("id", { count: "exact", head: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: subscribedUsers } = await (admin.from("users") as any)
    .select("id", { count: "exact", head: true })
    .eq("subscribed", true);

  // ── Total sessions ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalSessions } = await (admin.from("sessions") as any)
    .select("id", { count: "exact", head: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: completedSessions } = await (admin.from("sessions") as any)
    .select("id", { count: "exact", head: true })
    .not("receipt", "is", null);

  // ── Signups last 7 days ─────────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: newUsersWeek } = await (admin.from("users") as any)
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // ── Stripe: MRR ─────────────────────────────────────────────
  let mrr: number | null = null;
  let activeSubscriptions = 0;
  let trialingSubscriptions = 0;
  let recentCharges: { amount: number; currency: string; created: number; email: string | null }[] = [];

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Fetch active + trialing subscriptions
    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.subscriptions.list({ status: "trialing", limit: 100 }),
    ]);

    activeSubscriptions = activeSubs.data.length;
    trialingSubscriptions = trialingSubs.data.length;

    // Calculate MRR from active subscriptions
    let mrrCents = 0;
    for (const sub of activeSubs.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = price.unit_amount ?? 0;
        const interval = price.recurring?.interval;
        const intervalCount = price.recurring?.interval_count ?? 1;
        if (interval === "month") {
          mrrCents += amount * (item.quantity ?? 1) / intervalCount;
        } else if (interval === "year") {
          mrrCents += (amount * (item.quantity ?? 1)) / (12 * intervalCount);
        }
      }
    }
    mrr = mrrCents / 100;

    // Recent successful charges
    const charges = await stripe.charges.list({ limit: 5 });
    recentCharges = await Promise.all(
      charges.data
        .filter((c) => c.paid && !c.refunded)
        .map(async (c) => {
          let email: string | null = null;
          if (c.customer) {
            try {
              const customer = await stripe.customers.retrieve(c.customer as string);
              email = !("deleted" in customer) ? (customer.email ?? null) : null;
            } catch { /* ignore */ }
          }
          return { amount: c.amount / 100, currency: c.currency, created: c.created, email };
        }),
    );
  } catch (err) {
    console.error("[admin/metrics] Stripe error:", err);
  }

  return Response.json({
    users: { total: totalUsers ?? 0, subscribed: subscribedUsers ?? 0, newThisWeek: newUsersWeek ?? 0 },
    sessions: { total: totalSessions ?? 0, completed: completedSessions ?? 0 },
    stripe: { mrr, activeSubscriptions, trialingSubscriptions, recentCharges },
  });
}
