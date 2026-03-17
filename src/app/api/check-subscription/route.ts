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

  // Stripe fallback: if webhook failed or is delayed, check Stripe directly.
  // This runs whenever subscribed=false AND we have a stripe_customer_id.
  if (data?.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const subs = await stripe.subscriptions.list({
        customer: data.stripe_customer_id,
        status: "active",
        limit: 1,
      });
      if (subs.data.length > 0) {
        // Active subscription found — heal the DB and unblock the user
        await getSupabaseAdmin()
          .from("users")
          .update({ subscribed: true })
          .eq("id", user.id);
        return Response.json({ subscribed: true });
      }
    } catch {
      // Stripe API error — fall through and return false
    }
  }

  return Response.json({ subscribed: false });
}
