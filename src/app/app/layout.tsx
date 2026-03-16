import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import SignOutButton from "@/components/SignOutButton";
import type { Database } from "@/lib/database.types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* Top navigation */}
      <nav className="sticky top-0 z-50 border-b border-zinc-900 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Left: brand + nav links */}
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2 group">
              <span className="h-2 w-2 rounded-full bg-emerald-400 transition group-hover:bg-emerald-300" />
              <span className="text-sm font-semibold tracking-tight">StudyWith</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/app"
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
              >
                Dashboard
              </Link>
              <Link
                href="/app/new"
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
              >
                New session
              </Link>
            </div>
          </div>

          {/* Right: user info + sign out */}
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-xs text-zinc-600 sm:block">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="pb-16">{children}</main>
    </div>
  );
}
