"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus, X, BookOpen, LogOut, Pencil, Settings, PanelLeftClose, PanelLeftOpen, Home, Trash2, BarChart2, LifeBuoy } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { posthog } from "@/lib/posthog";
import type { LearningReceipt } from "@/lib/database.types";

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
  gritStreak?: number;
}

function detectSubjectLabel(session: Session): string {
  const receipt = session.receipt as LearningReceipt | null;
  const fromReceipt = receipt?.subject?.trim();
  if (fromReceipt) return fromReceipt;

  const t = `${session.title ?? ""}\n${session.assignment_text}`.toLowerCase();
  if (/\b(biology|dna|meiosis|mitosis|enzyme|photosynthesis|ecosystem)\b/.test(t)) return "Biology";
  if (/\b(chemistry|mole|molar|equilibrium|le chatelier|haber|reaction|acid|base)\b/.test(t)) return "Chemistry";
  if (/\b(physics|force|energy|wave|voltage|current|lens|newton)\b/.test(t)) return "Physics";
  if (/\b(history|1916|rising|ww1|ww2|cold war|treaty|partition)\b/.test(t)) return "History";
  if (/\b(english|poem|poetry|comparative|single text|composition|thesis)\b/.test(t)) return "English";
  if (/\b(math|maths|algebra|calculus|differentiat|integrat|trigonometry|geometry|probability|statistics)\b/.test(t) || /\d\s*[×÷+\-*/^]\s*\d/.test(t)) return "Maths";
  if (/\b(french|spanish|german|italian|translate|conjugat|vocabulary|grammar)\b/.test(t)) return "Languages";
  if (/\b(business|accounting|economics|marketing|cash flow|supply|demand)\b/.test(t)) return "Business";
  return "General";
}

function detectSensitive(session: Session): boolean {
  const t = `${session.title ?? ""}\n${session.assignment_text}`.toLowerCase();
  // Lightweight, explicit keywords. This is a UI flag, not a safety classifier.
  return /\b(suicide|self-harm|self harm|kill myself|end my life|abuse|assault|rape|overdose|crisis)\b/.test(t);
}

function masteryForSubject(sessions: Session[]): number | null {
  const scored = sessions
    .map((s) => (s.receipt as LearningReceipt | null)?.score)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (scored.length === 0) return null;
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  return Math.max(0, Math.min(100, Math.round(avg)));
}

function SidebarContent({
  sessions,
  userEmail,
  gritStreak = 0,
  onNav,
  onCollapse,
}: AppSidebarProps & { onNav?: () => void; onCollapse?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [localTitles, setLocalTitles] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    posthog.reset();
    router.push("/");
  };

  const startRename = (session: Session, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current =
      localTitles[session.id] ??
      session.title ??
      session.assignment_text.slice(0, 40);
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

  const confirmDelete = async (sessionId: string) => {
    setDeletedIds((prev) => new Set(prev).add(sessionId));
    setDeletingId(null);
    await fetch("/api/delete-session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    // If we deleted the currently viewed session, go to dashboard
    if (pathname === `/app/session/${sessionId}`) {
      router.push("/app");
    }
  };

  const getTitle = (session: Session) => {
    const raw =
      localTitles[session.id] ??
      session.title ??
      session.assignment_text;
    return raw.length > 40 ? raw.slice(0, 40) + "…" : raw;
  };

  const getDate = (session: Session) =>
    new Date(session.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <a
          href="/"
          className="font-serif text-xl font-semibold text-[#1A2B3C] hover:opacity-80 transition-opacity"
        >
          StudyWith
        </a>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-[#64748B] hover:text-[#334155] hover:bg-white transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
        {onNav && (
          <button
            onClick={onNav}
            className="md:hidden p-1 text-[#334155] hover:text-[#0F172A] transition-colors"
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
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1A2B3C] text-white hover:bg-[#1A2B3C]/90 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={2} />
          New session
        </a>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {(() => {
          const visible = sessions.filter((s) => !deletedIds.has(s.id));
          const bySubject = new Map<string, Session[]>();
          for (const s of visible) {
            const subject = detectSubjectLabel(s);
            const arr = bySubject.get(subject) ?? [];
            arr.push(s);
            bySubject.set(subject, arr);
          }

          const orderedSubjects = Array.from(bySubject.keys()).sort((a, b) => {
            if (a === "General") return 1;
            if (b === "General") return -1;
            return a.localeCompare(b);
          });

          const renderItem = (session: Session, allowEdit: boolean) => {
            const href = `/app/session/${session.id}`;
            const isActive =
              pathname === `/receipt/${session.id}` ||
              pathname === `/app/session/${session.id}` ||
              pathname === `/app/session/${session.id}/summary`;
            const isRenaming = renamingId === session.id;
            const isConfirmingDelete = deletingId === session.id;
            const isSensitive = detectSensitive(session);

            return (
              <div
                key={session.id}
                className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl border transition ${
                  isActive
                    ? "bg-white text-[#0F172A] border-[#CBD5E1]"
                    : "text-[#334155] border-transparent hover:bg-white hover:border-[#E2E8F0] hover:text-[#0F172A]"
                }`}
                style={isSensitive ? { borderColor: "#B91C1C", boxShadow: "0 0 0 1px rgba(185,28,28,0.10) inset" } : undefined}
              >
                {isSensitive ? (
                  <LifeBuoy className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#B91C1C]" strokeWidth={1.8} />
                ) : (
                  <BookOpen
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${session.receipt ? "text-[#64748B]" : "text-[#1A2B3C]"}`}
                    strokeWidth={1.5}
                  />
                )}
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
                    className="flex-1 min-w-0 flex flex-col overflow-hidden"
                  >
                    <span
                      className="text-sm leading-snug whitespace-nowrap overflow-hidden block"
                      style={{
                        maskImage: "linear-gradient(to right, black 60%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to right, black 60%, transparent 100%)",
                      }}
                    >
                      {isSensitive ? "Resource & Support" : getTitle(session)}
                    </span>
                    <span className="text-[10px] text-[#64748B] mt-0.5">{getDate(session)}</span>
                  </a>
                )}
                {allowEdit && !isRenaming && !isConfirmingDelete && (
                  <div className="shrink-0 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => startRename(session, e)}
                      className="p-0.5 text-[#94A3B8] hover:text-[#334155] transition"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(session.id); }}
                      className="p-0.5 text-[#94A3B8] hover:text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
                {allowEdit && isConfirmingDelete && (
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void confirmDelete(session.id); }}
                      className="text-[10px] font-medium text-red-500 hover:text-red-600 px-1 py-0.5 rounded transition"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(null); }}
                      className="text-[10px] text-[#A8A29E] hover:text-[#57534E] px-1 py-0.5 rounded transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          };

          if (visible.length === 0) {
            return (
              <p className="text-xs text-[#A8A29E] px-4 py-3">No sessions yet. Start one above.</p>
            );
          }

          return (
            <>
              {orderedSubjects.map((subject) => {
                const subjectSessions = (bySubject.get(subject) ?? []).slice().sort((a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                );

                const inProgress = subjectSessions.filter((s) => s.receipt === null);
                const completed = subjectSessions.filter((s) => s.receipt !== null);
                const mastery = masteryForSubject(completed);
                const isOpen = openSubjects[subject] ?? true;

                return (
                  <div key={subject} className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSubjects((prev) => ({ ...prev, [subject]: !(prev[subject] ?? true) }))
                      }
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/70 transition"
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1A2B3C] truncate">
                            {subject}
                          </p>
                          <span className="text-[10px] text-[#64748B] shrink-0">
                            {subjectSessions.length}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${mastery ?? 8}%`,
                                background: mastery == null ? "#CBD5E1" : "#1A2B3C",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[#64748B] shrink-0 tabular-nums">
                            {mastery == null ? "New" : `${mastery}%`}
                          </span>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-1 space-y-0.5">
                        {inProgress.map((s) => renderItem(s, true))}
                        {completed.map((s) => renderItem(s, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Footer: email + grit streak + nav + sign out */}
      <div className="px-3 py-4 border-t border-[#E7E5E4] space-y-1">
        {gritStreak > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 mb-1 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-100/80 shadow-sm">
            <span className="text-base leading-none">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700">{gritStreak} day streak</p>
              <p className="text-[10px] text-amber-500">Keep it going</p>
            </div>
          </div>
        )}
        <div className="flex items-center px-4 mb-1">
          <p className="text-xs text-[#64748B] truncate">{userEmail}</p>
        </div>
        <a
          href="/app/stats"
          onClick={onNav}
          className={`flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm transition ${
            pathname === "/app/stats"
              ? "bg-white text-[#0F172A] border border-[#CBD5E1]"
              : "text-[#334155] hover:bg-white hover:text-[#0F172A]"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          Statistics
        </a>
        <a
          href="/app/settings"
          onClick={onNav}
          className={`flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm transition ${
            pathname === "/app/settings"
              ? "bg-white text-[#0F172A] border border-[#CBD5E1]"
              : "text-[#334155] hover:bg-white hover:text-[#0F172A]"
          }`}
        >
          <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
          Settings
        </a>
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-[#334155] hover:bg-white hover:text-[#0F172A] transition"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppSidebar({ sessions: initialSessions, userEmail, gritStreak = 0 }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const pathname = usePathname();

  // Re-fetch whenever the user navigates so new sessions appear immediately
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: { sessions?: Session[] }) => {
        if (d.sessions) setSessions(d.sessions);
      })
      .catch(() => {
        // silently keep initial SSR data on error
      });
  }, [pathname]);

  // Hide bottom nav on any chat/session page (full-screen layout)
  const isSessionPage =
    pathname?.startsWith("/app/session/") || pathname === "/app/new";

  return (
    <>
      {/* Mobile: sessions drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: sessions slide-in drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-[#F8FAFC] border-r border-[#E2E8F0] z-50 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          sessions={sessions}
          userEmail={userEmail}
          gritStreak={gritStreak}
          onNav={() => setMobileOpen(false)}
        />
      </aside>

      {/* Mobile: bottom nav bar */}
      {!isSessionPage && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F8FAFC] border-t border-[#E2E8F0]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* 5 zones: Home | Sessions | [spacer/+] | Stats | Settings */}
          <div className="flex h-14 relative">
            <a
              href="/app"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                pathname === "/app" ? "text-[#0F172A]" : "text-[#64748B]"
              }`}
            >
              <Home className="w-5 h-5" strokeWidth={pathname === "/app" ? 2 : 1.5} />
              Home
            </a>

            <button
              onClick={() => setMobileOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                mobileOpen ? "text-[#0F172A]" : "text-[#64748B]"
              }`}
            >
              <BookOpen className="w-5 h-5" strokeWidth={1.5} />
              Sessions
            </button>

            {/* centre spacer - + button floats here */}
            <div className="flex-1" />

            <a
              href="/app/stats"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                pathname === "/app/stats" ? "text-[#0F172A]" : "text-[#64748B]"
              }`}
            >
              <BarChart2 className="w-5 h-5" strokeWidth={pathname === "/app/stats" ? 2 : 1.5} />
              Stats
            </a>

            <a
              href="/app/settings"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                pathname === "/app/settings" ? "text-[#0F172A]" : "text-[#64748B]"
              }`}
            >
              <Settings className="w-5 h-5" strokeWidth={pathname === "/app/settings" ? 2 : 1.5} />
              Settings
            </a>

            {/* + button: absolutely centred */}
            <a
              href="/app/new"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1A2B3C] flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </a>
          </div>
        </nav>
      )}

      {/* Desktop collapsed - floating toggle with brand */}
      {desktopCollapsed && (
        <div className="hidden md:flex fixed top-0 left-0 z-50 items-center gap-2.5 px-4 h-[62px] border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            onClick={() => setDesktopCollapsed(false)}
            title="Open sidebar"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#334155] hover:bg-white transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <a href="/" className="font-serif text-base font-semibold text-[#1A2B3C] hover:opacity-80 transition-opacity">StudyWith</a>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex md:flex-col shrink-0 h-full bg-[#F8FAFC] border-r border-[#E2E8F0] overflow-hidden transition-all duration-200 ease-in-out ${
          desktopCollapsed ? "w-0 border-r-0" : "w-64"
        }`}
      >
        <SidebarContent
          sessions={sessions}
          userEmail={userEmail}
          gritStreak={gritStreak}
          onCollapse={() => setDesktopCollapsed(true)}
        />
      </aside>
    </>
  );
}
