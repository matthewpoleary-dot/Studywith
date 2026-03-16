import TutorChat from "@/components/TutorChat";

export default function NewSessionPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">New tutoring session</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste your assignment below, then work through it step by step. No instant
          answers — just guided thinking.
        </p>
      </div>
      <TutorChat />
    </div>
  );
}
