import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { LearningReceipt as ReceiptData } from "@/lib/database.types";

type LearningReceiptProps = {
  sessionId: string;
};

export default async function LearningReceipt({ sessionId }: LearningReceiptProps) {
  const { data: session, error } = await getSupabaseAdmin()
    .from("sessions")
    .select("receipt, assignment_text, created_at")
    .eq("id", sessionId)
    .not("receipt", "is", null)
    .single();

  if (error || !session?.receipt) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-900 pb-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Learning Receipt
          </div>
          <h1 className="text-2xl font-semibold text-zinc-50">Receipt not found</h1>
          <p className="text-xs text-zinc-500">
            This receipt may not exist or hasn&apos;t been generated yet.
          </p>
        </header>
      </div>
    );
  }

  const receipt = session.receipt as unknown as ReceiptData;
  const date = new Date(session.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const scoreColor =
    receipt.score >= 75
      ? "text-emerald-300"
      : receipt.score >= 50
        ? "text-yellow-300"
        : "text-red-400";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-zinc-900 pb-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Learning Receipt
        </div>
        <h1 className="text-2xl font-semibold text-zinc-50">
          Session from <span className="text-emerald-300">{date}</span>
        </h1>
        <p className="text-xs text-zinc-500">
          This page is shareable. It never shows your exact answers — only what you
          learned, where you struggled, and what to review.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-900 bg-black/40 p-4">
          <div className="text-xs font-medium text-zinc-500">Overall score</div>
          <div className={`mt-2 text-4xl font-semibold ${scoreColor}`}>
            {receipt.score}
            <span className="text-lg text-zinc-600">/100</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Reflects how confidently you handled the main ideas of the assignment.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-black/40 p-4">
          <div className="text-xs font-medium text-zinc-500">Concepts covered</div>
          {receipt.conceptsCovered.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-300">
              {receipt.conceptsCovered.map((concept, i) => (
                <li key={i}>{concept}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-600">No concepts recorded.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-black/40 p-4">
          <div className="text-xs font-medium text-zinc-500">Gaps to review</div>
          {receipt.gaps.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-300">
              {receipt.gaps.map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-600">No gaps identified.</p>
          )}
        </div>
      </section>

      {receipt.summary && (
        <section className="rounded-2xl border border-zinc-900 bg-black/40 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">Summary</div>
          <p className="text-sm leading-relaxed text-zinc-300">{receipt.summary}</p>
        </section>
      )}

      {session.assignment_text && (
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">Original assignment</div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
            {session.assignment_text}
          </p>
        </section>
      )}
    </div>
  );
}
