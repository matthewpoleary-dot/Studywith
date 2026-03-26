import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import TutorChat from "@/components/TutorChat";
import CompletedSessionView from "@/components/CompletedSessionView";
import type { Database, LearningReceipt } from "@/lib/database.types";
import type { TutorMessage } from "@/components/TutorChat";

type SessionRow = {
  id: string;
  user_id: string;
  assignment_text: string;
  title: string | null;
  messages: unknown;
  receipt: unknown | null;
  created_at: string;
};

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

  // Try to fetch the session (with title column)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin().from("sessions") as any;
  let session: SessionRow | null = null;

  const { data: full, error: fullError } = await admin
    .select("id, user_id, assignment_text, title, messages, receipt, created_at")
    .eq("id", id)
    .single();

  if (!fullError) {
    session = full as SessionRow;
  } else {
    // title column may not exist yet - fall back without it
    const { data: basic } = await admin
      .select("id, user_id, assignment_text, messages, receipt, created_at")
      .eq("id", id)
      .single();
    if (basic) session = { ...basic, title: null } as SessionRow;
  }

  if (!session || session.user_id !== user.id) notFound();

  const messages = (session.messages ?? []) as TutorMessage[];

  // Completed session - show tabbed chat + receipt view
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

  // Active session - show the live chat
  return (
    <TutorChat
      initialAssignment={session.assignment_text}
      initialMessages={messages}
      initialSessionId={session.id}
    />
  );
}
