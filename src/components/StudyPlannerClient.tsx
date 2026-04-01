"use client";

import { useState } from "react";
import { CalendarDays, ChevronRight, Trash2, RotateCcw, TrendingUp, Clock, BookOpen, Zap, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudyTopic {
  subject: string;
  topic: string;
  effort: number;
  marksPotential: number;
  priorityScore: number;
  predictionNote: string;
  weekNumber: number;
  completed?: boolean;
}

interface StudyPlan {
  id: string;
  exam_type: string;
  exam_year: number;
  subjects: string[];
  start_date: string;
  sessions_per_week: number;
  session_duration_mins: number;
  topics: StudyTopic[];
  created_at: string;
}

interface Props {
  initialPlan: StudyPlan | null;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const LC_SUBJECTS = [
  "English", "Irish", "Mathematics", "Biology", "Chemistry", "Physics",
  "Agricultural Science", "History", "Geography", "French", "German",
  "Spanish", "Italian", "Business", "Economics", "Accounting",
  "Home Economics", "Music", "Art", "Design & Communication Graphics",
  "Computer Science", "Physical Education", "Politics & Society",
  "Classical Studies",
];

const JC_SUBJECTS = [
  "English", "Irish", "Mathematics", "Science", "History", "Geography",
  "French", "German", "Spanish", "Business Studies", "Home Economics",
  "Music", "Art", "CSPE", "Technical Graphics", "Metalwork",
  "Materials Technology (Wood)", "Computer Science", "Drama",
];

const DURATIONS = [30, 45, 60, 90];

// ── Helpers ───────────────────────────────────────────────────────────────────

function roiLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 60) return { label: "High ROI", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (score >= 30) return { label: "Mid ROI", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  return { label: "Low ROI", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" };
}

function effortDots(effort: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`inline-block w-2 h-2 rounded-full ${i < effort ? "bg-[#57534E]" : "bg-[#E7E5E4]"}`}
    />
  ));
}

function marksBars(marks: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`inline-block w-2 h-2 rounded-full ${i < marks ? "bg-[#D97706]" : "bg-[#E7E5E4]"}`}
    />
  ));
}

function daysUntilExam(examType: string, examYear: number): number {
  const examDate = new Date(examType === "LC" ? `June 4, ${examYear}` : `June 11, ${examYear}`);
  return Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Wizard ────────────────────────────────────────────────────────────────────

function Wizard({ onPlanCreated }: { onPlanCreated: (plan: StudyPlan) => void }) {
  const [step, setStep] = useState<"exam" | "subjects" | "schedule">("exam");
  const [examType, setExamType] = useState<"LC" | "JC">("LC");
  const [examYear] = useState(2026);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = examType === "LC" ? LC_SUBJECTS : JC_SUBJECTS;

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/study-planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_type: examType,
          exam_year: examYear,
          subjects: selectedSubjects,
          start_date: startDate,
          sessions_per_week: sessionsPerWeek,
          session_duration_mins: sessionDuration,
        }),
      });
      const data = (await res.json()) as { plan?: StudyPlan; error?: string };
      if (!data.plan) throw new Error(data.error ?? "Generation failed");
      onPlanCreated(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const stepNum = step === "exam" ? 1 : step === "subjects" ? 2 : 3;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-1">
          Study Planner
        </h1>
        <p className="text-sm text-[#57534E]">
          AI-powered priority plan based on historical exam patterns.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["exam", "subjects", "schedule"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stepNum > i + 1
                  ? "bg-[#D97706] text-white"
                  : stepNum === i + 1
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-[#E7E5E4] text-[#A8A29E]"
              }`}
            >
              {stepNum > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${stepNum === i + 1 ? "text-[#1A1A1A]" : "text-[#A8A29E]"}`}>
              {s === "exam" ? "Exam" : s === "subjects" ? "Subjects" : "Schedule"}
            </span>
            {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-[#D6D3D1]" />}
          </div>
        ))}
      </div>

      {/* Step 1: Exam type */}
      {step === "exam" && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-[#1A1A1A] mb-3">Which exam are you preparing for?</p>
            <div className="grid grid-cols-2 gap-3">
              {(["LC", "JC"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setExamType(type)}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                    examType === type
                      ? "border-[#D97706] bg-amber-50/50"
                      : "border-[#E7E5E4] bg-white hover:border-[#D6D3D1]"
                  }`}
                >
                  <p className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-1">{type}</p>
                  <p className="text-xs text-[#57534E]">
                    {type === "LC" ? "Leaving Certificate" : "Junior Certificate"}
                  </p>
                  <p className="text-[10px] text-[#A8A29E] mt-1">
                    {type === "LC" ? "Approx. June 4, 2026" : "Approx. June 11, 2026"}
                  </p>
                  {examType === type && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#D97706] flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-[#FAFAF8] border border-[#E7E5E4] px-4 py-3">
            <p className="text-xs text-[#57534E] leading-relaxed">
              <span className="font-medium text-[#1A1A1A]">How this works:</span> Claude analyses historical {examType} exam patterns, syllabus weighting, and cycle predictions to rank every topic by its return on study time — so you always study the highest-impact material first.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep("subjects")}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Subjects */}
      {step === "subjects" && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-[#1A1A1A] mb-1">Select your subjects</p>
            <p className="text-xs text-[#A8A29E] mb-3">{selectedSubjects.length} selected</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedSubjects.includes(s)
                      ? "bg-[#D97706] border-[#D97706] text-white"
                      : "bg-white border-[#E7E5E4] text-[#57534E] hover:border-[#D97706]/50 hover:text-[#1A1A1A]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep("exam")}
              className="px-5 py-2.5 text-sm text-[#57534E] border border-[#E7E5E4] rounded-xl hover:bg-[#F5F4F0] transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep("schedule")}
              disabled={selectedSubjects.length === 0}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === "schedule" && (
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                When do you want to start?
              </label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#1A1A1A] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Sessions per week: <span className="text-[#D97706]">{sessionsPerWeek}</span>
              </label>
              <input
                type="range"
                min={1}
                max={7}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                className="w-full accent-[#D97706]"
              />
              <div className="flex justify-between text-[10px] text-[#A8A29E] mt-1">
                <span>1 (casual)</span>
                <span>7 (daily)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Session length
              </label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSessionDuration(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      sessionDuration === d
                        ? "bg-[#D97706] border-[#D97706] text-white"
                        : "bg-white border-[#E7E5E4] text-[#57534E] hover:border-[#D97706]/50"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep("subjects")}
              disabled={generating}
              className="px-5 py-2.5 text-sm text-[#57534E] border border-[#E7E5E4] rounded-xl hover:bg-[#F5F4F0] transition disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => void generate()}
              disabled={generating}
              className="flex items-center gap-2 bg-[#D97706] text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-[#D97706]/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating plan…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Plan
                </>
              )}
            </button>
          </div>

          {generating && (
            <p className="text-xs text-[#A8A29E] text-center">
              Analysing {examType} exam patterns for {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Plan View ─────────────────────────────────────────────────────────────────

function PlanView({ plan: initialPlan, onReset }: { plan: StudyPlan; onReset: () => void }) {
  const [view, setView] = useState<"priority" | "weekly">("priority");
  const [topics, setTopics] = useState<StudyTopic[]>(initialPlan.topics as StudyTopic[]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [confirmReset, setConfirmReset] = useState(false);

  const daysLeft = daysUntilExam(initialPlan.exam_type, initialPlan.exam_year);
  const completedCount = topics.filter((t) => t.completed).length;
  const subjectList = Array.isArray(initialPlan.subjects) ? initialPlan.subjects as string[] : [];

  const toggleComplete = (idx: number) => {
    setTopics((prev) => {
      const updated = prev.map((t, i) => (i === idx ? { ...t, completed: !t.completed } : t));
      return updated;
    });
  };

  const maxWeek = Math.max(...topics.map((t) => t.weekNumber), 1);

  const weeklyGroups: Record<number, StudyTopic[]> = {};
  for (const t of topics) {
    const w = t.weekNumber ?? 1;
    if (!weeklyGroups[w]) weeklyGroups[w] = [];
    weeklyGroups[w].push(t);
  }

  const sortedPriority = [...topics].sort((a, b) => b.priorityScore - a.priorityScore);

  const toggleWeek = (w: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A]">
            Study Planner
          </h1>
          <button
            onClick={() => setConfirmReset(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#57534E] border border-[#E7E5E4] rounded-xl hover:bg-[#F5F4F0] transition mt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New plan
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] text-white text-xs font-semibold">
            {initialPlan.exam_type}
          </span>
          <span className="text-sm text-[#57534E]">{subjectList.join(", ")}</span>
        </div>
      </div>

      {/* Confirm reset */}
      {confirmReset && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800 mb-3">Delete this plan and start over?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                void fetch("/api/study-planner", { method: "DELETE" }).then(onReset);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-4 py-1.5 text-xs text-[#57534E] border border-[#E7E5E4] rounded-lg hover:bg-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-[#D97706]" strokeWidth={1.5} />
            <p className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wide">Days left</p>
          </div>
          <p className="text-2xl font-semibold text-[#1A1A1A]">{Math.max(0, daysLeft)}</p>
          <p className="text-[10px] text-[#A8A29E]">until exam</p>
        </div>
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#D97706]" strokeWidth={1.5} />
            <p className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wide">Topics</p>
          </div>
          <p className="text-2xl font-semibold text-[#1A1A1A]">{completedCount}/{topics.length}</p>
          <p className="text-[10px] text-[#A8A29E]">completed</p>
        </div>
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-[#D97706]" strokeWidth={1.5} />
            <p className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wide">Per week</p>
          </div>
          <p className="text-2xl font-semibold text-[#1A1A1A]">{initialPlan.sessions_per_week}</p>
          <p className="text-[10px] text-[#A8A29E]">{initialPlan.session_duration_mins}m sessions</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-1.5 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#D97706] transition-all"
            style={{ width: `${topics.length ? (completedCount / topics.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-[10px] text-[#A8A29E] mt-1">{Math.round(topics.length ? (completedCount / topics.length) * 100 : 0)}% complete</p>
      </div>

      {/* View toggle */}
      <div className="flex border-b border-[#E7E5E4] mb-5">
        {(["priority", "weekly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              view === v
                ? "border-[#1A1A1A] text-[#1A1A1A]"
                : "border-transparent text-[#A8A29E] hover:text-[#57534E]"
            }`}
          >
            {v === "priority" ? (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Priority
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Weekly
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Priority view */}
      {view === "priority" && (
        <div className="space-y-2">
          <p className="text-xs text-[#A8A29E] mb-3">
            Sorted by highest marks ÷ lowest effort — study from the top.
          </p>
          {sortedPriority.map((topic, idx) => {
            const roi = roiLabel(topic.priorityScore);
            const originalIdx = topics.indexOf(topic);
            return (
              <div
                key={`${topic.subject}-${topic.topic}`}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                  topic.completed
                    ? "bg-[#FAFAF8] border-[#E7E5E4] opacity-60"
                    : "bg-white border-[#E7E5E4] hover:border-[#D6D3D1]"
                }`}
              >
                {/* Rank */}
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#F5F4F0] flex items-center justify-center mt-0.5">
                  <span className="text-[10px] font-semibold text-[#A8A29E]">{idx + 1}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-[10px] font-semibold text-[#D97706] uppercase tracking-wide">
                        {topic.subject}
                      </span>
                      <p className={`text-sm font-medium ${topic.completed ? "line-through text-[#A8A29E]" : "text-[#1A1A1A]"}`}>
                        {topic.topic}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roi.bg} ${roi.color}`}>
                      {roi.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#57534E] mb-2 leading-relaxed">{topic.predictionNote}</p>
                  <div className="flex items-center gap-4 text-[10px] text-[#A8A29E]">
                    <span className="flex items-center gap-1">
                      Effort <span className="flex gap-0.5 ml-1">{effortDots(topic.effort)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      Marks <span className="flex gap-0.5 ml-1">{marksBars(topic.marksPotential)}</span>
                    </span>
                    <span>Week {topic.weekNumber}</span>
                  </div>
                </div>

                {/* Tick */}
                <button
                  onClick={() => toggleComplete(originalIdx)}
                  className="shrink-0 mt-0.5 text-[#A8A29E] hover:text-[#D97706] transition"
                  title={topic.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {topic.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
                  ) : (
                    <Circle className="w-5 h-5" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly view */}
      {view === "weekly" && (
        <div className="space-y-3">
          <p className="text-xs text-[#A8A29E] mb-3">
            Topics spread across {maxWeek} week{maxWeek !== 1 ? "s" : ""}, highest priority first.
          </p>
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((week) => {
            const weekTopics = weeklyGroups[week] ?? [];
            const weekComplete = weekTopics.every((t) => t.completed);
            const isExpanded = expandedWeeks.has(week);

            // Calculate approximate date for this week
            const weekStart = new Date(initialPlan.start_date);
            weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
            const weekLabel = weekStart.toLocaleDateString("en-IE", { day: "numeric", month: "short" });

            return (
              <div key={week} className="rounded-2xl border border-[#E7E5E4] overflow-hidden">
                <button
                  onClick={() => toggleWeek(week)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                    weekComplete ? "bg-emerald-50/50" : "bg-white hover:bg-[#FAFAF8]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      weekComplete ? "bg-emerald-100 text-emerald-700" : "bg-[#F5F4F0] text-[#57534E]"
                    }`}>
                      {weekComplete ? "✓" : week}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">Week {week}</p>
                      <p className="text-[10px] text-[#A8A29E]">w/c {weekLabel} · {weekTopics.length} topic{weekTopics.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#A8A29E]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#A8A29E]" />
                  )}
                </button>

                {isExpanded && weekTopics.length > 0 && (
                  <div className="border-t border-[#E7E5E4] divide-y divide-[#F5F4F0]">
                    {weekTopics.map((topic) => {
                      const roi = roiLabel(topic.priorityScore);
                      const originalIdx = topics.indexOf(topic);
                      return (
                        <div
                          key={`${topic.subject}-${topic.topic}`}
                          className={`flex items-start gap-3 px-4 py-3 ${topic.completed ? "opacity-50" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-semibold text-[#D97706]">{topic.subject}</span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${roi.bg} ${roi.color}`}>
                                {roi.label}
                              </span>
                            </div>
                            <p className={`text-sm ${topic.completed ? "line-through text-[#A8A29E]" : "text-[#1A1A1A]"}`}>
                              {topic.topic}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleComplete(originalIdx)}
                            className="shrink-0 mt-0.5 text-[#A8A29E] hover:text-[#D97706] transition"
                          >
                            {topic.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
                            ) : (
                              <Circle className="w-5 h-5" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-[10px] text-[#A8A29E] text-center">
        Predictions are AI-generated based on historical {initialPlan.exam_type} exam patterns. Always verify with your teachers.
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function StudyPlannerClient({ initialPlan }: Props) {
  const [plan, setPlan] = useState<StudyPlan | null>(initialPlan);

  if (plan) {
    return <PlanView plan={plan} onReset={() => setPlan(null)} />;
  }

  return <Wizard onPlanCreated={(p) => setPlan(p)} />;
}
