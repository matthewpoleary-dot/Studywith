import Link from "next/link";
import { Brand } from "./Brand";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-strong py-12">
      <div className="shell grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            AI for understanding, practice and revision. Never for producing assessed work.
          </p>
        </div>
        <div className="grid content-start gap-3 text-sm">
          <strong>Product</strong>
          <Link href="/pricing">Pricing</Link>
          <Link href="/schools">For schools</Link>
          <Link href="/auth/login">Sign in</Link>
        </div>
        <div className="grid content-start gap-3 text-sm">
          <strong>Legal</strong>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:hello@studywith.live">Contact</a>
        </div>
      </div>
    </footer>
  );
}
