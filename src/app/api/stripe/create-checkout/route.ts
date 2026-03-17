import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // Authenticate user
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

  // Fetch user record to get existing Stripe customer ID
  const { data: userData } = await getSupabaseAdmin()
    .from("users")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  let customerId = userData?.stripe_customer_id ?? null;

  // Create Stripe customer if not yet set up
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    // Upsert so this works even if the users row was never created by the trigger
    await getSupabaseAdmin()
      .from("users")
      .upsert(
        {
          id: user.id,
          email: userData?.email ?? user.email ?? "",
          stripe_customer_id: customerId,
        },
        { onConflict: "id" },
      );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "StudyWith Monthly",
            description: "Unlimited guided tutoring sessions and learning receipts.",
          },
          unit_amount: 2000, // €20.00
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/payment-success`,
    cancel_url: `${siteUrl}/?payment=cancelled`,
    metadata: { supabase_user_id: user.id },
  });

  return Response.json({ url: session.url });
}
