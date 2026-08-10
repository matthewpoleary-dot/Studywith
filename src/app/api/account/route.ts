import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabase-server";

export async function DELETE() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const admin = createAdminSupabase(); const { data } = await admin.from("users").select("stripe_customer_id").eq("id", user.id).maybeSingle(); if (data?.stripe_customer_id) { const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); const subscriptions = await stripe.subscriptions.list({ customer: data.stripe_customer_id, status: "all", limit: 20 }); for (const subscription of subscriptions.data) if (subscription.status !== "canceled") await stripe.subscriptions.cancel(subscription.id); } const { error } = await admin.auth.admin.deleteUser(user.id); if (error) return NextResponse.json({ error: "Account deletion failed. Contact support if this continues." }, { status: 500 }); const supabase = await createServerSupabase(); await supabase.auth.signOut(); return NextResponse.json({ deleted: true }); }
