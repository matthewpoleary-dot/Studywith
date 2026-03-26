import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

// Academic email domains for student pricing
const STUDENT_DOMAINS = [
  ".edu", ".ac.uk", ".ac.ie", ".ac.nz", ".ac.za", ".ac.in", ".ac.au",
  ".edu.au", ".edu.ie", ".edu.sg", ".edu.hk",
];

function isStudentEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return STUDENT_DOMAINS.some((d) => lower.includes(d));
}

type Plan = "trial" | "monthly" | "annual";

// Check whether this customer/email has ever had a Stripe trial
async function hasUsedTrial(
  stripe: Stripe,
  customerId: string | null,
  email: string,
): Promise<boolean> {
  const customerIds = new Set<string>();
  if (customerId) customerIds.add(customerId);

  // Also search by email - catches deleted accounts that re-registered
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 5 });
    for (const c of customers.data) customerIds.add(c.id);
  }

  for (const cid of customerIds) {
    const subs = await stripe.subscriptions.list({
      customer: cid,
      status: "all",
      limit: 20,
    });
    if (subs.data.some((s) => s.trial_start != null)) return true;
  }
  return false;
}

function getPriceData(plan: Plan, student: boolean) {
  const monthly = {
    currency: "eur",
    product_data: {
      name: student ? "StudyWith Pro (Student)" : "StudyWith Pro",
      description: "Unlimited guided tutoring sessions and learning receipts.",
    },
    unit_amount: student ? 599 : 1299, // €5.99 or €12.99
    recurring: { interval: "month" as const },
  };

  if (plan === "annual") {
    return {
      currency: "eur",
      product_data: {
        name: student ? "StudyWith Pro Annual (Student)" : "StudyWith Pro Annual",
        description: "Unlimited guided tutoring sessions and learning receipts.",
      },
      unit_amount: student ? 3900 : 8900, // €39 or €89
      recurring: { interval: "year" as const },
    };
  }

  // trial and monthly use the same monthly pricing
  return monthly;
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
    if (body.plan === "trial" || body.plan === "annual") plan = body.plan;
    if (body.plan === "monthly") plan = "monthly";
    referredBy = body.referred_by || undefined;
  } catch {
    // No body - default to monthly
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

  const { data: userData } = await getSupabaseAdmin()
    .from("users")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  let customerId = userData?.stripe_customer_id ?? null;

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

  // Trial abuse prevention - one trial per person, tracked via Stripe history
  if (plan === "trial") {
    const trialUsed = await hasUsedTrial(stripe, customerId, email);
    if (trialUsed) {
      return Response.json({ error: "trial_used" }, { status: 400 });
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    // For the free trial we allow "no card required" by not collecting a payment method up front.
    // If the user doesn't add a payment method by trial end, the subscription will be cancelled.
    payment_method_collection: plan === "trial" ? "if_required" : "always",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: getPriceData(plan, student),
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/payment-success`,
    cancel_url: `${siteUrl}/?payment=cancelled`,
    metadata: { supabase_user_id: user.id },
  };

  // Free trial - 7 days (14 for referred users)
  if (plan === "trial") {
    sessionConfig.subscription_data = {
      trial_period_days: referredBy ? 14 : 7,
      trial_settings: {
        end_behavior: {
          missing_payment_method: "cancel",
        },
      },
      metadata: {
        supabase_user_id: user.id,
        referred_by: referredBy ?? "",
      },
    };
  } else {
    sessionConfig.subscription_data = {
      metadata: { supabase_user_id: user.id },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return Response.json({ url: session.url });
}
