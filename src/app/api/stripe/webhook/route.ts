import Stripe from "stripe";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";

// Force dynamic so Next.js never caches this route
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // Read raw bytes - NEVER call request.json() here; it breaks HMAC verification
  const rawBody = Buffer.from(await request.arrayBuffer());

  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerEmail =
        session.customer_details?.email ?? session.customer_email ?? "";
      if (userId) {
        // Use upsert so this works even if the DB trigger never created the row
        await getSupabaseAdmin()
          .from("users")
          .upsert(
            { id: userId, email: customerEmail, subscribed: true },
            { onConflict: "id" },
          );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await getSupabaseAdmin()
        .from("users")
        .update({ subscribed: false })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer?.id ?? null);
      if (customerId) {
        await getSupabaseAdmin()
          .from("users")
          .update({ subscribed: false })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
