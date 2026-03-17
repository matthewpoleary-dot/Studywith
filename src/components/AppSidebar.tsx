"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Plus, Menu, X, BookOpen, LogOut, Pencil } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Session {
  id: string;
  assignment_text: string;
  title: string | null;
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [localTitles, setLocalTitles] = useState<Record<string, string>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const startRename = (session: Session, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current =
      localTitles[session.id] ??
      session.title ??
      session.assignment_text.slice(0, 60);
    setRenamingId(session.id);
    setRenameValue(current);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const saveRename = async (sessionId: string) => {
    const trimmed = renameValue.trim();
    setLocalTitles((prev) => ({ ...prev, [sessionId]: trimmed }));
    setRenamingId(null);
    await fetch("/api/rename-session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, title: trimmed }),
    });
  };

  const getDisplayName = (session: Session) => {
    const raw =
      localTitles[session.id] ??
      session.title ??
      session.assignment_text;
    return raw.length > 48 ? raw.slice(0, 48) + "..." : raw;
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
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 transition"
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
                const href = hasReceipt ? `/receipt/${session.id}` : "/app/new";
                const isActive = pathname === `/receipt/${session.id}`;
                const isRenaming = renamingId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
                      isActive
                        ? "bg-[#E7E5E4] text-[#1A1A1A]"
                        : "text-[#57534E] hover:bg-[#E7E5E4]/60 hover:text-[#1A1A1A]"
                    }`}
                  >
                    <BookOpen
                      className="w-3.5 h-3.5 shrink-0 text-[#D97706] mt-0.5"
                      strokeWidth={1.5}
                    />

                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => void saveRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveRename(session.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="flex-1 min-w-0 bg-white border border-[#D97706]/50 rounded-lg px-2 py-0.5 text-xs text-[#1A1A1A] outline-none focus:ring-1 focus:ring-[#D97706]/30"
                        autoFocus
                      />
                    ) : (
                      <a
                        href={href}
                        onClick={onNav}
                        className="flex-1 min-w-0 text-sm truncate leading-snug"
                      >
                        {getDisplayName(session)}
                      </a>
                    )}

                    {!isRenaming && (
                      <button
                        onClick={(e) => startRename(session, e)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-[#A8A29E] hover:text-[#57534E] transition"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
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
      {!mobileOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white border border-[#E7E5E4] shadow-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-[#1A1A1A]" />
        </button>
      )}

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

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

      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#F5F4F0] border-r border-[#E7E5E4] overflow-hidden">
        <SidebarContent sessions={sessions} userEmail={userEmail} />
      </aside>
    </>
  );
}
