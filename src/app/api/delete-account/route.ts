import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export async function DELETE() {
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
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Cancel active Stripe subscriptions (keep customer record for trial abuse prevention)
  if (userData?.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const subs = await stripe.subscriptions.list({
        customer: userData.stripe_customer_id,
        status: "all",
        limit: 10,
      });
      for (const sub of subs.data) {
        if (sub.status === "active" || sub.status === "trialing") {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
    } catch {
      // Stripe error — continue with account deletion
    }
  }

  // Delete the Supabase auth user (cascades to users table via DB trigger/FK)
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
