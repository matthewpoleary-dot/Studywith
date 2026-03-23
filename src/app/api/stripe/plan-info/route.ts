import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await getSupabaseAdmin()
    .from("users")
    .select("stripe_customer_id, subscribed")
    .eq("id", user.id)
    .single();

  if (!userData?.stripe_customer_id || !userData.subscribed) {
    return Response.json({ subscribed: false });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const subscriptions = await stripe.subscriptions.list({
    customer: userData.stripe_customer_id,
    status: "all",
    limit: 5,
    expand: ["data.items.data.price"],
  });

  const active = subscriptions.data.find(
    (s) => s.status === "active" || s.status === "trialing",
  );

  if (!active) {
    return Response.json({ subscribed: false });
  }

  const item = active.items.data[0];
  const price = item?.price;
  const amount = price?.unit_amount ?? 0;
  const currency = price?.currency ?? "eur";
  const interval = price?.recurring?.interval ?? "month";
  const trialing = active.status === "trialing";
  const trialEnd = active.trial_end;
  const periodEnd = active.current_period_end;

  return Response.json({
    subscribed: true,
    trialing,
    interval, // "month" | "year"
    amount, // in cents
    currency,
    currentPeriodEnd: periodEnd, // unix timestamp
    trialEnd: trialEnd ?? null, // unix timestamp or null
  });
}
