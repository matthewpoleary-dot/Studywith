import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import TutorChat from "@/components/TutorChat";
import CompletedSessionView from "@/components/CompletedSessionView";
import type { Database, LearningReceipt } from "@/lib/database.types";
import type { TutorMessage } from "@/components/TutorChat";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify auth
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/app");

  // Fetch the session
  const { data: session } = await getSupabaseAdmin()
    .from("sessions")
    .select("id, user_id, assignment_text, title, messages, receipt, created_at")
    .eq("id", id)
    .single();

  if (!session || session.user_id !== user.id) notFound();

  const messages = (session.messages ?? []) as TutorMessage[];

  // Completed session — show tabbed chat + receipt view
  if (session.receipt) {
    return (
      <CompletedSessionView
        sessionId={session.id}
        assignment={session.assignment_text}
        messages={messages}
        receipt={session.receipt as unknown as LearningReceipt}
        title={session.title}
        createdAt={session.created_at}
      />
    );
  }

  // Active session — show the live chat
  return (
    <TutorChat
      initialAssignment={session.assignment_text}
      initialMessages={messages}
      initialSessionId={session.id}
    />
  );
}
