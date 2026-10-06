import Link from "next/link";
import { Brand } from "./Brand";

export function PublicNav({ inverse = false }: { inverse?: boolean }) {
  return (
    <header
      className={
        inverse ? "absolute inset-x-0 top-0 z-20 text-white" : "border-b border-line bg-paper/90 backdrop-blur"
      }
    >
      <div className="shell flex h-[76px] items-center justify-between">
        <Brand inverse={inverse} />
        <nav aria-label="Main navigation" className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/schools"
            className={`focus-ring hidden rounded-full px-4 py-2 sm:block ${inverse ? "hover:bg-white/10" : "hover:bg-white"}`}
          >
            For schools
          </Link>
          <Link
            href="/pricing"
            className={`focus-ring hidden rounded-full px-4 py-2 sm:block ${inverse ? "hover:bg-white/10" : "hover:bg-white"}`}
          >
            Pricing
          </Link>
          <Link
            href="/auth/login"
            className={`focus-ring rounded-full px-4 py-2 ${inverse ? "border border-white/25 hover:bg-white/10" : "border border-line bg-paper-strong hover:border-ink"}`}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className={`focus-ring rounded-full px-4 py-2 ${inverse ? "bg-white text-ink hover:bg-[#eaf0ff]" : "bg-brand text-white hover:bg-[var(--blue-dark)]"}`}
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
