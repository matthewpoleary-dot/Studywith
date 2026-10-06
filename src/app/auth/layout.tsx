import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="soft-grid min-h-screen bg-paper">
      <header className="shell flex h-20 items-center">
        <Brand />
      </header>
      <div className="shell grid min-h-[calc(100vh-80px)] items-center gap-12 pb-16 lg:grid-cols-[.9fr_1.1fr]">
        <div className="hidden lg:block">
          <p className="eyebrow text-brand">Your study workspace</p>
          <h1 className="display mt-5 text-7xl leading-[.92] tracking-[-.05em]">
            A better next question changes everything.
          </h1>
          <p className="mt-6 max-w-md leading-7 text-muted">
            Explain. Practise. Recall. Plan. StudyWith brings the useful parts of AI into one focused LC workspace.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
