import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

// Academic email domains that qualify for student pricing
const STUDENT_DOMAINS = [
  ".edu",
  ".ac.uk",
  ".ac.ie",
  ".ac.nz",
  ".ac.za",
  ".ac.in",
  ".ac.au",
  ".edu.au",
  ".edu.ie",
  ".edu.sg",
  ".edu.hk",
];

function isStudentEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return STUDENT_DOMAINS.some((d) => lower.includes(d));
}

type Plan = "monthly" | "annual";

function getPriceData(plan: Plan, student: boolean) {
  if (plan === "annual") {
    return {
      currency: "eur",
      product_data: {
        name: student ? "StudyWith Annual (Student)" : "StudyWith Annual",
        description:
          "Unlimited guided tutoring sessions and learning receipts.",
      },
      unit_amount: student ? 3900 : 8900, // €39 or €89
      recurring: { interval: "year" as const },
    };
  }
  return {
    currency: "eur",
    product_data: {
      name: student ? "StudyWith Monthly (Student)" : "StudyWith Monthly",
      description:
        "Unlimited guided tutoring sessions and learning receipts.",
    },
    unit_amount: student ? 599 : 1299, // €5.99 or €12.99
    recurring: { interval: "month" as const },
  };
}

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Parse request body
  let plan: Plan = "monthly";
  let referredBy: string | undefined;
  try {
    const body = (await request.json()) as {
      plan?: Plan;
      referred_by?: string;
    };
    if (body.plan === "annual") plan = "annual";
    referredBy = body.referred_by || undefined;
  } catch {
    // No body or old call — default to monthly
  }

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

  const email = userData?.email ?? user.email ?? "";
  const student = isStudentEmail(email);

  // Referred users get 14 days (double the standard 7-day trial)
  const trialDays = referredBy ? 14 : 7;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    // No credit card required to start the free trial
    payment_method_collection: "if_required",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: getPriceData(plan, student),
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: {
        supabase_user_id: user.id,
        referred_by: referredBy ?? "",
      },
    },
    success_url: `${siteUrl}/payment-success`,
    cancel_url: `${siteUrl}/?payment=cancelled`,
    metadata: { supabase_user_id: user.id },
  });

  return Response.json({ url: session.url });
}
