"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Star, Pencil, Trash2, Check, X, Clock } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { LearningReceipt } from "@/lib/database.types";
import { posthog } from "@/lib/posthog";

type SessionRow = {
  id: string;
  assignment_text: string;
  title: string | null;
  created_at: string;
  receipt: unknown | null;
};

type TimePeriod = "all" | "7d" | "30d" | "90d";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  all: "All time",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

// ── Subject detection ─────────────────────────────────────────────────────────
function detectSubjectTag(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(algorithm|programming|code|python|javascript|java|c\+\+|database|software|html|css|function|recursion|compiler)\b/.test(t)) return "Comp Sci";
  if (/\b(circuit|thermodynamics|mechanical|structural|stress|strain|fluid|engineering|statics|dynamics|beam|torque|voltage)\b/.test(t)) return "Engineering";
  if (/\b(economics|supply|demand|gdp|inflation|macroeconom|microeconom|fiscal|monetary|elasticity|equilibrium|market|trade)\b/.test(t)) return "Economics";
  if (/\b(psychology|behaviour|cognitive|memory|attachment|personality|experiment|mental|stimulus|response|piaget|freud)\b/.test(t)) return "Psychology";
  if (/\b(accounting|ledger|debit|credit|trial balance|balance sheet|income statement|profit|depreciation|revenue)\b/.test(t)) return "Business";
  if (/\b(business|marketing|management|strategy|finance|entrepreneur|stakeholder|swot|cash flow)\b/.test(t)) return "Business";
  if (/\b(art|design|colour|composition|painting|sculpture|photography|typography|texture|perspective|visual|aesthetic)\b/.test(t)) return "Art & Design";
  if (/\b(math|algebra|calculus|equation|differentiat|integrat|trigonometry|geometry|probability|statistics|vector|matrix|polynomial|logarithm|quadratic|solve|calculate|squared|factorial|prime)\b/.test(t) || /\d\s*[×÷+\-*/^]\s*\d/.test(t)) return "Maths";
  if (/\b(biology|chemistry|physics|photosynthesis|atom|molecule|cell|dna|evolution|force|energy|wave|element|compound|reaction|enzyme|science)\b/.test(t)) return "Science";
  if (/\b(essay|literature|poem|poetry|novel|write|writing|argument|thesis|character|theme|metaphor|narrative|prose|language analysis)\b/.test(t)) return "English";
  if (/\b(history|war|revolution|empire|century|medieval|ancient|cold war|world war|industrial|political|government|democracy|monarch)\b/.test(t)) return "History";
  if (/\b(french|spanish|german|italian|japanese|chinese|korean|arabic|latin|translate|conjugat|vocabulary|grammar|verb|tense)\b/.test(t)) return "Languages";
  return null;
}

const SUBJECT_TAG_STYLES: Record<string, string> = {
  "Maths":      "bg-blue-50 text-blue-600 border-blue-100",
  "Science":    "bg-emerald-50 text-emerald-600 border-emerald-100",
  "English":    "bg-purple-50 text-purple-600 border-purple-100",
  "History":    "bg-amber-50 text-amber-600 border-amber-100",
  "Economics":  "bg-teal-50 text-teal-600 border-teal-100",
  "Psychology": "bg-pink-50 text-pink-600 border-pink-100",
  "Business":   "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Comp Sci":   "bg-cyan-50 text-cyan-600 border-cyan-100",
  "Engineering":"bg-orange-50 text-orange-600 border-orange-100",
  "Languages":  "bg-rose-50 text-rose-600 border-rose-100",
  "Art & Design":"bg-violet-50 text-violet-600 border-violet-100",
};

// ── Score colours (new thresholds: 0-39 amber, 40-69 orange, 70+ emerald) ────
function avgScoreColor(score: number) {
  if (score >= 70) return { text: "text-emerald-600", bar: "#10B981" };
  if (score >= 40) return { text: "text-orange-500",  bar: "#FB923C" };
  return            { text: "text-amber-500",   bar: "#FBBF24" };
}

function sessionScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-orange-500";
  return "text-amber-500";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcStreak(sessions: { created_at: string }[]): number {
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(sessions.map((s) => toKey(new Date(s.created_at))));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    if (days.has(toKey(d))) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function sessionLabel(s: SessionRow) {
  const raw =
    s.title ??
    (s.assignment_text.length > 60
      ? s.assignment_text.slice(0, 60) + "…"
      : s.assignment_text) ??
    "Session";
  return raw.replace(/^#+\s*/, "").trim();
}

function filterByPeriod(sessions: SessionRow[], period: TimePeriod): SessionRow[] {
  if (period === "all") return sessions;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sessions.filter((s) => new Date(s.created_at) >= cutoff);
}

function formatStudyTime(totalSessions: number): string {
  const mins = totalSessions * 20; // ~20 min per session estimate
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  initialSessions: SessionRow[];
  streak: number;
  dailyGoal: number | null;
  sessionsToday: number;
  dailyGoalMet: boolean;
};

export default function StatsClient({
  initialSessions,
  streak,
  dailyGoal,
  sessionsToday,
  dailyGoalMet,
}: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  useEffect(() => { posthog.capture('stats_page_viewed') }, [])

  const handleTimePeriod = (p: TimePeriod) => {
    setTimePeriod(p);
    posthog.capture('stats_time_filter_changed', { filter: TIME_PERIOD_LABELS[p] });
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const completedSessions = sessions.filter((s) => s.receipt !== null);
  const filteredForAvg = filterByPeriod(completedSessions, timePeriod);

  const avgScore =
    filteredForAvg.length > 0
      ? Math.round(
          filteredForAvg.reduce((acc, s) => {
            const r = s.receipt as unknown as LearningReceipt;
            return acc + (r?.score ?? 0);
          }, 0) / filteredForAvg.length,
        )
      : null;

  const goalSurpassed = dailyGoal !== null && sessionsToday > dailyGoal;
  const studyTimeLabel = formatStudyTime(sessions.length);

  function startEdit(s: SessionRow) {
    setEditingId(s.id);
    setEditValue(sessionLabel(s));
    setConfirmDeleteId(null);
  }

  async function saveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingId(null); return; }
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)));
    setEditingId(null);
    await supabase.from("sessions").update({ title: trimmed } as never).eq("id", id);
  }

  function cancelEdit() { setEditingId(null); }

  function promptDelete(id: string) {
    setConfirmDeleteId(id);
    setEditingId(null);
  }

  async function confirmDelete(id: string) {
    setDeletingId(id);
    setConfirmDeleteId(null);
    await supabase.from("sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  function cancelDelete() { setConfirmDeleteId(null); }

  return (
    <div className="space-y-6">
      {/* ── Top row: Streak + Daily Goal + Total Study Time ─────────────────── */}
      <div className={`grid gap-4 ${dailyGoal !== null ? "grid-cols-3" : "grid-cols-2"}`}>
        {/* Streak */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
          <p className="text-xs font-medium text-[#57534E] mb-3">Daily streak</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{streak}</p>
            <span className="text-xl mb-0.5">{streak > 0 ? "🔥" : "💤"}</span>
          </div>
          <p className="text-xs text-[#A8A29E] mt-1">
            {streak === 0 ? "Study today to start one" : streak === 1 ? "1 day in a row" : `${streak} days in a row`}
          </p>
        </div>

        {/* Daily Goal */}
        {dailyGoal !== null && (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[#57534E]">Today&apos;s goal</p>
              {dailyGoalMet && (
                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 leading-none">
                  {goalSurpassed ? "Goal Surpassed!" : "Goal Met!"}
                </span>
              )}
            </div>
            <div className="flex items-end gap-1">
              <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{sessionsToday}</p>
              <span className="text-base text-[#A8A29E] mb-0.5">/{dailyGoal}</span>
            </div>
            {/* Progress bar with glow when goal met */}
            <div
              className={`mt-2 h-1.5 w-full rounded-full bg-[#E7E5E4] overflow-hidden transition-shadow ${
                dailyGoalMet ? "shadow-[0_0_8px_3px_rgba(16,185,129,0.35)]" : ""
              }`}
            >
              <div
                className={`h-full rounded-full transition-all ${dailyGoalMet ? "bg-emerald-500" : "bg-[#D97706]"}`}
                style={{ width: `${Math.min(100, Math.round((sessionsToday / dailyGoal) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-[#A8A29E] mt-1">
              {dailyGoalMet ? `${sessionsToday} completed today` : `${dailyGoal - sessionsToday} more to go`}
            </p>
          </div>
        )}

        {/* Total Study Time */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[#57534E]">Study time</p>
            <Clock className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={1.5} />
          </div>
          <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{studyTimeLabel}</p>
          <p className="text-xs text-[#A8A29E] mt-1">estimated total</p>
        </div>
      </div>

      {/* ── Counts + avg score with time filter ──────────────────────────────── */}
      <div>
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {(Object.keys(TIME_PERIOD_LABELS) as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => handleTimePeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                timePeriod === p
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-white border border-[#E7E5E4] text-[#57534E] hover:border-[#A8A29E]"
              }`}
            >
              {TIME_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] md:text-xs font-medium text-[#57534E]">Sessions</p>
              <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#A8A29E]" strokeWidth={1.5} />
            </div>
            <p className="text-2xl md:text-3xl font-serif font-medium text-[#1A1A1A]">
              {filterByPeriod(sessions, timePeriod).length}
            </p>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] md:text-xs font-medium text-[#57534E]">Completed</p>
              <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#A8A29E]" strokeWidth={1.5} />
            </div>
            <p className="text-2xl md:text-3xl font-serif font-medium text-[#1A1A1A]">
              {filteredForAvg.length}
            </p>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] md:text-xs font-medium text-[#57534E]">Avg score</p>
              <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#A8A29E]" strokeWidth={1.5} />
            </div>
            {avgScore !== null ? (
              <>
                <p className={`text-2xl md:text-3xl font-serif font-medium ${avgScoreColor(avgScore).text}`}>
                  {avgScore}<span className="text-sm md:text-base text-[#A8A29E]">/100</span>
                </p>
                <div className="mt-2 h-1 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${avgScore}%`, backgroundColor: avgScoreColor(avgScore).bar }}
                  />
                </div>
              </>
            ) : (
              <p className="text-2xl md:text-3xl font-serif font-medium text-[#A8A29E]">--</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Learning History ──────────────────────────────────────────────────── */}
      {completedSessions.length > 0 && (
        <div>
          <h2 className="font-medium text-[#1A1A1A] mb-3">Learning History</h2>
          <div className="space-y-2">
            {completedSessions.map((s) => {
              const receipt = s.receipt as unknown as LearningReceipt;
              const score = receipt?.score ?? null;
              const subjectTag = detectSubjectTag(s.assignment_text);
              const date = new Date(s.created_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              });
              const isEditing = editingId === s.id;
              const isConfirmingDelete = confirmDeleteId === s.id;
              const isDeleting = deletingId === s.id;

              return (
                <div
                  key={s.id}
                  className={`bg-white border rounded-xl px-5 py-3.5 transition-all ${
                    isDeleting ? "opacity-40" : "border-[#E7E5E4]"
                  }`}
                >
                  {isConfirmingDelete ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-[#57534E]">Delete this session?</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => confirmDelete(s.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-all"
                        >
                          Delete
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="text-xs font-medium text-[#57534E] hover:text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E7E5E4] hover:border-[#A8A29E] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(s.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 min-w-0 text-sm text-[#1A1A1A] bg-[#F5F4F0] rounded-lg px-3 py-1.5 border border-[#D97706]/40 outline-none focus:border-[#D97706]"
                      />
                      <button onClick={() => saveEdit(s.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all" title="Save">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 rounded-lg text-[#A8A29E] hover:bg-[#F5F4F0] transition-all" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Subject tag pill */}
                        {subjectTag && (
                          <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${SUBJECT_TAG_STYLES[subjectTag] ?? "bg-[#F5F4F0] text-[#57534E] border-[#E7E5E4]"}`}>
                            {subjectTag}
                          </span>
                        )}
                        <Link
                          href={`/app/session/${s.id}`}
                          className="text-sm text-[#1A1A1A] truncate flex-1 min-w-0 hover:text-[#D97706] transition-colors"
                        >
                          {sessionLabel(s)}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {score !== null && (
                          <span className={`text-sm font-medium ${sessionScoreColor(score)}`}>{score}/100</span>
                        )}
                        <span className="text-xs text-[#A8A29E]">{date}</span>
                        <button
                          onClick={() => startEdit(s)}
                          className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F4F0] transition-all"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => promptDelete(s.id)}
                          className="p-1.5 rounded-lg text-[#A8A29E] hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
