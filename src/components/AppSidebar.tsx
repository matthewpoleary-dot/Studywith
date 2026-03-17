"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Menu, X, BookOpen, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Session {
  id: string;
  assignment_text: string;
  created_at: string;
  receipt: Record<string, unknown> | null;
}

interface AppSidebarProps {
  sessions: Session[];
  userEmail: string;
}

function SidebarContent({
  sessions,
  userEmail,
  onNav,
}: AppSidebarProps & { onNav?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#E7E5E4]">
        <a
          href="/"
          className="font-serif text-xl font-semibold text-[#1A1A1A] hover:opacity-70 transition-opacity"
        >
          StudyWith
        </a>
        {onNav && (
          <button
            onClick={onNav}
            className="md:hidden p-1 text-[#57534E] hover:text-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New session button */}
      <div className="px-3 pt-4 pb-2">
        <a
          href="/app/new"
          onClick={onNav}
          className={`flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            pathname === "/app/new"
              ? "bg-[#1A1A1A] text-white"
              : "bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80"
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={2} />
          New session
        </a>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sessions.length === 0 ? (
          <p className="text-xs text-[#A8A29E] px-4 py-3">
            No sessions yet. Start one above.
          </p>
        ) : (
          <>
            <p className="text-[10px] font-semibold text-[#A8A29E] px-4 pt-3 pb-2 uppercase tracking-widest">
              History
            </p>
            <div className="space-y-0.5">
              {sessions.map((session) => {
                const hasReceipt = session.receipt !== null;
                const href = hasReceipt
                  ? `/receipt/${session.id}`
                  : "/app/new";
                const isActive = pathname === `/receipt/${session.id}`;
                const text =
                  session.assignment_text.length > 48
                    ? session.assignment_text.slice(0, 48) + "..."
                    : session.assignment_text;

                return (
                  <a
                    key={session.id}
                    href={href}
                    onClick={onNav}
                    className={`flex items-start gap-2.5 px-4 py-2.5 rounded-xl text-sm transition ${
                      isActive
                        ? "bg-[#E7E5E4] text-[#1A1A1A]"
                        : "text-[#57534E] hover:bg-[#E7E5E4]/60 hover:text-[#1A1A1A]"
                    }`}
                  >
                    <BookOpen
                      className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D97706]"
                      strokeWidth={1.5}
                    />
                    <span className="truncate leading-snug">{text}</span>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer: email + sign out */}
      <div className="px-3 py-4 border-t border-[#E7E5E4] space-y-1">
        <p className="text-xs text-[#A8A29E] px-4 truncate">{userEmail}</p>
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-[#57534E] hover:bg-[#E7E5E4]/60 hover:text-[#1A1A1A] transition"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppSidebar({ sessions, userEmail }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger — shown only when sidebar is closed */}
      {!mobileOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white border border-[#E7E5E4] shadow-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-[#1A1A1A]" />
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-[#F5F4F0] border-r border-[#E7E5E4] z-50 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          sessions={sessions}
          userEmail={userEmail}
          onNav={() => setMobileOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#F5F4F0] border-r border-[#E7E5E4] overflow-hidden">
        <SidebarContent sessions={sessions} userEmail={userEmail} />
      </aside>
    </>
  );
}
