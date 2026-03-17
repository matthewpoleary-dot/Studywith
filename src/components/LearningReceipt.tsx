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
      <div className="rounded-2xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
          Learning Receipt
        </p>
        <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-2">
          Receipt not found
        </h1>
        <p className="text-sm text-[#57534E]">
          This receipt may not exist or hasn&apos;t been generated yet.
        </p>
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
      ? "text-emerald-600"
      : receipt.score >= 50
        ? "text-[#D97706]"
        : "text-red-500";

  const scoreBg =
    receipt.score >= 75
      ? "bg-emerald-50 border-emerald-100"
      : receipt.score >= 50
        ? "bg-amber-50 border-amber-100"
        : "bg-red-50 border-red-100";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-2">
          Learning Receipt
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-2">
          Session from{" "}
          <span className="text-[#D97706]">{date}</span>
        </h1>
        <p className="text-sm text-[#57534E]">
          This page is shareable. It never shows your exact answers — only what you
          learned, where you struggled, and what to review.
        </p>
      </div>

      {/* Score + concepts + gaps */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Score */}
        <div className={`rounded-2xl border p-6 ${scoreBg}`}>
          <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
            Overall score
          </p>
          <div className={`font-serif text-5xl font-medium ${scoreColor}`}>
            {receipt.score}
            <span className="text-xl text-[#A8A29E]">/100</span>
          </div>
          <p className="mt-3 text-xs text-[#57534E] leading-relaxed">
            Reflects how confidently you handled the main ideas of the assignment.
          </p>
        </div>

        {/* Concepts covered */}
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
            Concepts covered
          </p>
          {receipt.conceptsCovered.length > 0 ? (
            <ul className="space-y-1.5">
              {receipt.conceptsCovered.map((concept, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
                  <span className="mt-0.5 text-[#D97706]">✓</span>
                  {concept}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#A8A29E]">No concepts recorded.</p>
          )}
        </div>

        {/* Gaps to review */}
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
            Gaps to review
          </p>
          {receipt.gaps.length > 0 ? (
            <ul className="space-y-1.5">
              {receipt.gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#57534E]">
                  <span className="mt-0.5 text-[#A8A29E]">→</span>
                  {gap}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#A8A29E]">No gaps identified.</p>
          )}
        </div>
      </section>

      {/* Summary */}
      {receipt.summary && (
        <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
            Summary
          </p>
          <p className="text-sm leading-relaxed text-[#1A1A1A]">{receipt.summary}</p>
        </section>
      )}

      {/* Original assignment */}
      {session.assignment_text && (
        <section className="rounded-2xl border border-[#E7E5E4] bg-[#F5F4F0] p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
            Original assignment
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#57534E]">
            {session.assignment_text}
          </p>
        </section>
      )}
    </div>
  );
}
