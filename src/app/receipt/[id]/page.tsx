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
    <div className="flex min-h-screen justify-center px-4 py-8 text-zinc-100">
      <main className="flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-zinc-900 bg-zinc-950/80 p-5 shadow-2xl shadow-black/60">
        <LearningReceipt sessionId={id} />
      </main>
    </div>
  );
}

