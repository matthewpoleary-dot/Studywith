import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function POST() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { data } = await createAdminSupabase().from("users").select("stripe_customer_id").eq("id", user.id).maybeSingle(); if (!data?.stripe_customer_id) return NextResponse.json({ error: "No Stripe billing profile exists yet." }, { status: 400 }); const session = await new Stripe(process.env.STRIPE_SECRET_KEY!).billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://studywith.live"}/app/settings` }); return NextResponse.json({ url: session.url }); }
