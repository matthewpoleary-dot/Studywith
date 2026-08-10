import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabase-server";
import { removeStoredStudyFiles } from "@/lib/study-files";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabase();
  const [{ data }, { data: attachments }] = await Promise.all([
    admin.from("users").select("stripe_customer_id").eq("id", user.id).maybeSingle(),
    admin.from("study_attachments").select("storage_path").eq("user_id", user.id),
  ]);
  if (data?.stripe_customer_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const subscriptions = await stripe.subscriptions.list({ customer: data.stripe_customer_id, status: "all", limit: 20 });
    for (const subscription of subscriptions.data) if (subscription.status !== "canceled") await stripe.subscriptions.cancel(subscription.id);
  }
  try {
    await removeStoredStudyFiles((attachments ?? []).map((item) => item.storage_path));
  } catch {
    return NextResponse.json({ error: "Your uploaded files could not be removed. No account data was deleted; try again." }, { status: 500 });
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Account deletion failed. Contact support if this continues." }, { status: 500 });
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ deleted: true });
}
