import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  return typeof value === "string" ? value : (value?.id ?? null);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  const admin = createAdminSupabase();
  const { error: eventError } = await admin.from("stripe_events").insert({ id: event.id, event_type: event.type });
  if (eventError) {
    if (eventError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    return new Response("Could not record event", { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const product = session.metadata?.product;
    if (userId && (product === "toolkit" || product === "pro_monthly" || product === "pro_annual")) {
      const customer = customerId(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
      await admin
        .from("users")
        .upsert(
          { id: userId, email: session.customer_details?.email ?? "", stripe_customer_id: customer },
          { onConflict: "id" },
        );
      if (product === "toolkit" && session.payment_status === "paid") {
        const paymentIntent =
          typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
        const campaignId = session.metadata?.campaign_id || null;
        await admin.from("purchases").upsert(
          {
            user_id: userId,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntent,
            product,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? "eur",
            status: "paid",
            campaign_id: campaignId,
          },
          { onConflict: "stripe_checkout_session_id" },
        );
        await admin.from("entitlements").upsert(
          {
            user_id: userId,
            kind: "toolkit",
            status: "active",
            source: "stripe",
            stripe_checkout_session_id: session.id,
            ai_credits: 25,
            metadata: { campaign_id: campaignId },
          },
          { onConflict: "stripe_checkout_session_id" },
        );
        if (campaignId)
          await admin
            .from("campaign_redemptions")
            .upsert({ campaign_id: campaignId, user_id: userId }, { onConflict: "campaign_id,user_id" });
      } else if (session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await admin.from("entitlements").upsert(
          {
            user_id: userId,
            kind: "pro",
            status: "active",
            source: "stripe",
            stripe_subscription_id: subscriptionId,
            stripe_checkout_session_id: session.id,
            metadata: { product },
          },
          { onConflict: "stripe_subscription_id" },
        );
        await admin.from("purchases").upsert(
          {
            user_id: userId,
            stripe_checkout_session_id: session.id,
            product,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? "eur",
            status: "paid",
          },
          { onConflict: "stripe_checkout_session_id" },
        );
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const status =
      event.type === "customer.subscription.deleted"
        ? "cancelled"
        : subscription.status === "active" || subscription.status === "trialing"
          ? "active"
          : subscription.status === "past_due" || subscription.status === "unpaid"
            ? "past_due"
            : "cancelled";
    const periodEnd = subscription.items.data[0]?.current_period_end;
    await admin
      .from("entitlements")
      .update({ status, ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null })
      .eq("stripe_subscription_id", subscription.id);
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const id = customerId(invoice.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
    if (id) {
      const { data: profile } = await admin.from("users").select("id").eq("stripe_customer_id", id).maybeSingle();
      if (profile)
        await admin
          .from("entitlements")
          .update({ status: "past_due" })
          .eq("user_id", profile.id)
          .eq("kind", "pro")
          .eq("source", "stripe");
    }
  }
  return NextResponse.json({ received: true });
}
