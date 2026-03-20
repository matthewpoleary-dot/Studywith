"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Star, Pencil, Trash2, Check, X } from "lucide-react";
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

  function startEdit(s: SessionRow) {
    setEditingId(s.id);
    setEditValue(sessionLabel(s));
    setConfirmDeleteId(null);
  }

  async function saveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)),
    );
    setEditingId(null);
    await supabase.from("sessions").update({ title: trimmed } as never).eq("id", id);
  }

  function cancelEdit() {
    setEditingId(null);
  }

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

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-6">
      {/* Streak + daily goal */}
      <div className={`grid gap-4 ${dailyGoal !== null ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
          <p className="text-xs font-medium text-[#57534E] mb-3">Daily streak</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{streak}</p>
            <span className="text-xl mb-0.5">{streak > 0 ? "🔥" : "💤"}</span>
          </div>
          <p className="text-xs text-[#A8A29E] mt-1">
            {streak === 0
              ? "Study today to start one"
              : streak === 1
              ? "1 day in a row"
              : `${streak} days in a row`}
          </p>
        </div>

        {dailyGoal !== null && (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <p className="text-xs font-medium text-[#57534E] mb-3">Today&apos;s goal</p>
            <div className="flex items-end gap-1">
              <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{sessionsToday}</p>
              <span className="text-base text-[#A8A29E] mb-0.5">/{dailyGoal}</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${dailyGoalMet ? "bg-emerald-500" : "bg-[#D97706]"}`}
                style={{ width: `${Math.min(100, Math.round((sessionsToday / dailyGoal) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-[#A8A29E] mt-1">
              {dailyGoalMet ? "Goal complete!" : `${dailyGoal - sessionsToday} more to go`}
            </p>
          </div>
        )}
      </div>

      {/* Counts + avg score with time filter */}
      <div>
        {/* Time period filter — above avg score */}
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
            <p className={`text-2xl md:text-3xl font-serif font-medium ${
              avgScore === null ? "text-[#A8A29E]"
              : avgScore >= 75 ? "text-emerald-600"
              : avgScore >= 50 ? "text-amber-600"
              : "text-red-500"
            }`}>
              {avgScore !== null ? avgScore : "--"}
              {avgScore !== null && <span className="text-sm md:text-base text-[#A8A29E]">/100</span>}
            </p>
            {avgScore !== null && (
              <div className="mt-2 h-1 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    avgScore >= 75 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-500" : "bg-red-400"
                  }`}
                  style={{ width: `${avgScore}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed session history */}
      {completedSessions.length > 0 && (
        <div>
          <h2 className="font-medium text-[#1A1A1A] mb-3">Session receipts</h2>
          <div className="space-y-2">
            {completedSessions.map((s) => {
              const receipt = s.receipt as unknown as LearningReceipt;
              const score = receipt?.score ?? null;
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
                      <button
                        onClick={() => saveEdit(s.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg text-[#A8A29E] hover:bg-[#F5F4F0] transition-all"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/app/session/${s.id}`}
                        className="text-sm text-[#1A1A1A] truncate flex-1 min-w-0 hover:text-[#D97706] transition-colors"
                      >
                        {sessionLabel(s)}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        {score !== null && (
                          <span className={`text-sm font-medium ${
                            score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"
                          }`}>{score}/100</span>
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
