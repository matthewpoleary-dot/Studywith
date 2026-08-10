import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`focus-ring inline-flex items-center gap-2 rounded-md font-extrabold tracking-[-.04em] ${inverse ? "text-white" : "text-ink"}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-[11px] text-sm font-black ${inverse ? "bg-white text-ink" : "bg-ink text-white"}`}>S</span>
      StudyWith
    </Link>
  );
}
