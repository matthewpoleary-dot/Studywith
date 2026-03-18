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
    return Response.json({ subscribed: false }, { status: 401 });
  }

  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("subscribed, stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Fast path: DB already says subscribed
  if (data?.subscribed) {
    return Response.json({ subscribed: true });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Active access = paid subscription OR free trial in progress
    const hasAccess = (status: string) =>
      status === "active" || status === "trialing";

    // Stripe fallback path 1: we have a customer ID saved — check directly
    if (data?.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: data.stripe_customer_id,
        status: "all",
        limit: 5,
      });
      if (subs.data.some((s) => hasAccess(s.status))) {
        await getSupabaseAdmin()
          .from("users")
          .upsert(
            { id: user.id, email: user.email ?? "", subscribed: true },
            { onConflict: "id" },
          );
        return Response.json({ subscribed: true });
      }
    }

    // Stripe fallback path 2: no customer ID in DB (e.g. paid before the upsert
    // fix was deployed). Search Stripe by email to find the customer, then save
    // the ID and check for an active or trialing subscription.
    if (user.email) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 5,
      });

      for (const customer of customers.data) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 5,
        });
        if (subs.data.some((s) => hasAccess(s.status))) {
          // Heal the DB: save stripe_customer_id and mark subscribed
          await getSupabaseAdmin()
            .from("users")
            .upsert(
              {
                id: user.id,
                email: user.email,
                stripe_customer_id: customer.id,
                subscribed: true,
              },
              { onConflict: "id" },
            );
          return Response.json({ subscribed: true });
        }
      }
    }
  } catch {
    // Stripe API error — fall through and return false
  }

  return Response.json({ subscribed: false });
}
