import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";

type Product = "toolkit" | "pro_monthly" | "pro_annual";
const products = {
  toolkit: {
    name: "AI Study Toolkit by StudyWith",
    description: "Permanent workflow library plus 25 fixed AI study actions",
    amount: 1900,
    mode: "payment" as const,
  },
  pro_monthly: {
    name: "StudyWith Pro Monthly",
    description: "Full StudyWith access, billed monthly",
    amount: 799,
    mode: "subscription" as const,
    interval: "month" as const,
  },
  pro_annual: {
    name: "StudyWith Pro Annual",
    description: "Full StudyWith access, billed annually",
    amount: 5900,
    mode: "subscription" as const,
    interval: "year" as const,
  },
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before checkout." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { product?: Product; campaignCode?: string | null } | null;
  const productKey = body?.product;
  if (!productKey || !Object.hasOwn(products, productKey))
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  const admin = createAdminSupabase();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { data: profile } = await admin
    .from("users")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("users")
      .upsert({ id: user.id, email: user.email ?? "", stripe_customer_id: customerId }, { onConflict: "id" });
  }
  let amount = products[productKey].amount;
  let campaignId = "";
  const campaignCode = String(body?.campaignCode ?? "")
    .trim()
    .toUpperCase();
  if (productKey === "toolkit" && campaignCode) {
    const now = new Date().toISOString();
    const { data: campaign } = await admin
      .from("talk_campaigns")
      .select("id, toolkit_price_cents, starts_at, ends_at")
      .eq("code", campaignCode)
      .eq("active", true)
      .lte("starts_at", now)
      .maybeSingle();
    if (campaign && (!campaign.ends_at || campaign.ends_at > now)) {
      amount = campaign.toolkit_price_cents;
      campaignId = campaign.id;
    }
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studywith.live";
  const product = products[productKey];
  const config: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: product.mode,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: { name: product.name, description: product.description },
          ...(product.mode === "subscription" ? { recurring: { interval: product.interval! } } : {}),
        },
      },
    ],
    success_url: `${site}/app/settings?payment=success`,
    cancel_url: `${site}/pricing?payment=cancelled`,
    allow_promotion_codes: product.mode === "subscription",
    metadata: { supabase_user_id: user.id, product: productKey, campaign_id: campaignId },
  };
  if (product.mode === "subscription")
    config.subscription_data = { metadata: { supabase_user_id: user.id, product: productKey } };
  const session = await stripe.checkout.sessions.create(config);
  return NextResponse.json({ url: session.url });
}
