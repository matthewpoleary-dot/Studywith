"use client";

type HighlighterProps = {
  children: React.ReactNode;
  tone?: "highlight" | "todo" | "error";
};

export default function Highlighter({ children, tone = "highlight" }: HighlighterProps) {
  const styles =
    tone === "error"
      ? "bg-red-50 text-[#0F172A] ring-1 ring-[#B91C1C]/40"
      : tone === "todo"
        ? "bg-[#FEF08A]/70 text-[#0F172A] ring-1 ring-[#EAB308]/25"
        : "bg-[#FEF08A]/55 text-[#0F172A] ring-1 ring-[#EAB308]/20";

  return (
    <mark className={`rounded-md px-1.5 py-0.5 font-medium ${styles}`}>
      {children}
    </mark>
  );
}

