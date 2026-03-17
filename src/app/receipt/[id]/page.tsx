import LearningReceipt from "@/components/LearningReceipt";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-[#E7E5E4] bg-[#FDFCF8]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="font-serif text-xl font-semibold text-[#1A1A1A] hover:opacity-70 transition-opacity"
          >
            StudyWith
          </a>
          <a
            href="/app"
            className="rounded-full border border-[#E7E5E4] px-4 py-2 text-sm font-medium text-[#57534E] transition-all hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <LearningReceipt sessionId={id} />
      </main>
    </div>
  );
}
