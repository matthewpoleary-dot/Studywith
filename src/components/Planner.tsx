"use client";

import {
  CalendarClock,
  CalendarDays,
  Clock3,
  Info,
  MessageCircleMore,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";

type Subject = { name: string; confidence: number; priority: number };
type Session = {
  day: string;
  time?: string;
  subject: string;
  focus: string;
  minutes: number;
  status?: "planned" | "completed";
};
type InitialPlan = {
  exam_year: number;
  sessions_per_week: number;
  session_duration_mins: number;
  subjects: Subject[];
  schedule: Session[];
  weekly_context: string;
};

const confidenceOptions = [
  {
    value: 1,
    label: "Need to relearn",
    help: "You cannot explain it clearly yet, so it receives more rebuilding time.",
  },
  { value: 3, label: "Getting there", help: "You understand some of it but still need practice and correction." },
  { value: 5, label: "Confident", help: "You can explain it and answer questions without much help." },
];
const priorityOptions = [
  { value: 1, label: "Normal", help: "No test, deadline or teacher request makes it urgent this week." },
  { value: 2, label: "Important", help: "It needs attention soon, so it receives extra weight." },
  { value: 3, label: "Teacher focus", help: "A teacher, test or deadline makes this a main focus right now." },
];

export function Planner({ initial }: { initial: InitialPlan | null }) {
  const [examYear, setExamYear] = useState(initial?.exam_year ?? 2027);
  const [sessions, setSessions] = useState(initial?.sessions_per_week ?? 5);
  const [minutes, setMinutes] = useState(initial?.session_duration_mins ?? 50);
  const [weeklyContext, setWeeklyContext] = useState(initial?.weekly_context ?? "");
  const [subjects, setSubjects] = useState<Subject[]>(
    initial?.subjects?.length
      ? initial.subjects
      : [
          { name: "Maths", confidence: 1, priority: 3 },
          { name: "English", confidence: 3, priority: 2 },
        ],
  );
  const [schedule, setSchedule] = useState(initial?.schedule ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [contextSummary, setContextSummary] = useState("");

  function updateSubject(index: number, patch: Partial<Subject>) {
    setSubjects((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function build() {
    setSaving(true);
    setMessage("");
    setContextSummary("");
    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examYear, sessionsPerWeek: sessions, sessionMinutes: minutes, subjects, weeklyContext }),
      });
      const body = (await response.json().catch(() => null)) as {
        schedule?: Session[];
        contextSummary?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.schedule)
        throw new Error(body?.error ?? "The plan could not be saved. Please try again.");
      setSchedule(body.schedule);
      setContextSummary(body.contextSummary ?? "");
      setMessage("Your planned week is built and saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The plan could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="eyebrow text-brand">Weekly study plan</p>
      <h1 className="display mt-3 max-w-4xl text-5xl tracking-[-.04em] md:text-6xl">
        A realistic week, weighted to what needs you most.
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
        Tell StudyWith what you need to cover and what is already in your calendar. It will spread planned sessions
        around your real week without pretending to predict the exam paper.
      </p>

      <div className="mt-7 grid gap-3 md:grid-cols-2">
        <div className="flex gap-3 rounded-2xl border border-[#cfd7fd] bg-[#eef1ff] p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand">
            <Target size={16} />
          </span>
          <div>
            <p className="text-xs font-black text-[#173ecc]">How well do you know this?</p>
            <p className="mt-1 text-xs leading-5 text-[#4b5770]">
              Lower confidence means the planner gives the subject more rebuilding time.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl border border-[#cfe6dc] bg-[#edf9f4] p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#087451]">
            <Info size={16} />
          </span>
          <div>
            <p className="text-xs font-black text-[#086348]">How important is it right now?</p>
            <p className="mt-1 text-xs leading-5 text-[#4b6259]">
              Use Teacher priority only when a teacher, test or deadline makes it urgent.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
        <section className="card overflow-hidden shadow-[0_18px_48px_rgba(16,24,32,.05)]">
          <header className="border-b border-line bg-[#fffdf9] p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white">
                <Clock3 size={18} />
              </span>
              <div>
                <h2 className="text-lg font-black">Your available time</h2>
                <p className="mt-0.5 text-xs text-muted">Set a week you can actually complete.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-xs font-extrabold">
                Exam year
                <input
                  type="number"
                  min={new Date().getFullYear()}
                  max="2035"
                  value={examYear}
                  onChange={(event) => setExamYear(Number(event.target.value))}
                  className="focus-ring rounded-xl border border-line bg-white px-3 py-3 text-sm font-bold outline-none focus:border-brand"
                />
              </label>
              <label className="grid gap-2 text-xs font-extrabold">
                Sessions per week
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={sessions}
                  onChange={(event) => setSessions(Number(event.target.value))}
                  className="focus-ring rounded-xl border border-line bg-white px-3 py-3 text-sm font-bold outline-none focus:border-brand"
                />
              </label>
              <label className="grid gap-2 text-xs font-extrabold">
                Minutes per session
                <select
                  value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))}
                  className="focus-ring rounded-xl border border-line bg-white px-3 py-3 text-sm font-bold outline-none focus:border-brand"
                >
                  {[25, 40, 50, 60, 75, 90].map((value) => (
                    <option key={value} value={value}>
                      {value} minutes
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          <div className="p-5 md:p-6">
            <label className="block rounded-[22px] border border-[#cfd7fd] bg-[#f3f5ff] p-4">
              <span className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-sm">
                  <MessageCircleMore size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">What else is in your week?</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    Write naturally. StudyWith will plan around training, work, grinds and days you cannot study.
                  </span>
                </span>
                <span className="rounded-full bg-brand px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white">
                  Smart planner
                </span>
              </span>
              <textarea
                value={weeklyContext}
                onChange={(event) => setWeeklyContext(event.target.value)}
                maxLength={2_000}
                rows={3}
                placeholder="e.g. I have rugby every Monday and Wednesday from 5–7pm, and I can’t study on Friday."
                className="focus-ring mt-4 w-full resize-y rounded-2xl border border-[#cfd7fd] bg-white px-4 py-3 text-sm font-medium leading-6 outline-none placeholder:text-[#8b9398] focus:border-brand"
              />
              <span className="mt-2 block text-[10px] font-medium text-muted">
                Kept private in your StudyWith plan; not sent to an external AI service.
              </span>
            </label>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">Subjects</h3>
                <p className="mt-1 text-xs text-muted">
                  Every subject gets a session when your weekly total allows it.
                </p>
              </div>
              <button
                type="button"
                disabled={subjects.length >= 12}
                onClick={() => setSubjects((items) => [...items, { name: "", confidence: 3, priority: 1 }])}
                className="focus-ring flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-xs font-extrabold text-brand shadow-sm hover:border-brand disabled:bg-[#edf0f1] disabled:text-[#8b9398]"
              >
                <Plus size={14} /> Add subject
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {subjects.map((subject, index) => (
                <article key={index} className="rounded-2xl border border-line bg-[#fffdf9] p-4">
                  <div className="flex items-center gap-3">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Subject name</span>
                      <input
                        value={subject.name}
                        onChange={(event) => updateSubject(index, { name: event.target.value })}
                        placeholder="Subject name"
                        className="focus-ring w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-extrabold outline-none focus:border-brand"
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${subject.name || "subject"}`}
                      onClick={() => setSubjects((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                      className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                    <label className="grid min-w-0 gap-1.5 text-[11px] font-extrabold text-[#4f5961]">
                      How well do you know it?
                      <select
                        aria-label={`${subject.name || "Subject"} confidence`}
                        value={normaliseConfidence(subject.confidence)}
                        onChange={(event) => updateSubject(index, { confidence: Number(event.target.value) })}
                        className="focus-ring min-w-0 w-full rounded-xl border border-[#cfd7fd] bg-[#f7f8ff] px-3 py-2.5 text-xs font-bold text-ink outline-none focus:border-brand"
                      >
                        {confidenceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className="min-h-10 text-[10px] font-medium leading-4 text-muted">
                        {
                          confidenceOptions.find((option) => option.value === normaliseConfidence(subject.confidence))
                            ?.help
                        }
                      </span>
                    </label>
                    <label className="grid min-w-0 gap-1.5 text-[11px] font-extrabold text-[#4f5961]">
                      How important is it now?
                      <select
                        aria-label={`${subject.name || "Subject"} priority`}
                        value={subject.priority}
                        onChange={(event) => updateSubject(index, { priority: Number(event.target.value) })}
                        className="focus-ring min-w-0 w-full rounded-xl border border-[#cfe6dc] bg-[#f5fbf8] px-3 py-2.5 text-xs font-bold text-ink outline-none focus:border-[#55b892]"
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className="min-h-10 text-[10px] font-medium leading-4 text-muted">
                        {priorityOptions.find((option) => option.value === subject.priority)?.help}
                      </span>
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void build()}
                disabled={saving || !subjects.some((item) => item.name.trim())}
                className="focus-ring flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#173ecc] disabled:bg-[#cbd0d3] disabled:text-[#687177] disabled:shadow-none"
              >
                <CalendarDays size={16} />
                {saving ? "Building your week…" : schedule.length ? "Rebuild my week" : "Build my week"}
              </button>
              {message ? (
                <p role="status" className="text-xs font-bold text-[#5d6670]">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card min-h-[680px] overflow-hidden shadow-[0_18px_48px_rgba(16,24,32,.05)]">
          <header className="flex items-center justify-between border-b border-line bg-[#fffdf9] p-6">
            <div>
              <p className="eyebrow text-brand">This week</p>
              <h2 className="mt-2 text-xl font-black">Your planned sessions</h2>
            </div>
            <span className="rounded-full bg-[#edf0f1] px-3 py-1.5 text-xs font-black text-[#5d6670]">
              {schedule.length} planned
            </span>
          </header>
          {schedule.length ? (
            <div>
              {contextSummary ? (
                <p className="mx-5 mt-5 rounded-xl border border-[#cfe6dc] bg-[#edf9f4] px-4 py-3 text-xs font-bold leading-5 text-[#086348] md:mx-6">
                  {contextSummary}
                </p>
              ) : null}
              <ol className="grid gap-3 p-5 md:p-6">
                {schedule.map((item, index) => (
                  <li
                    key={`${item.day}-${item.time ?? "time"}-${item.subject}-${index}`}
                    className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand hover:shadow-sm"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5e9ff] text-brand">
                      <CalendarClock size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm font-black">{item.subject}</strong>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#edf9f4] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#087451]">
                            Planned
                          </span>
                          <span className="rounded-full bg-[#f2f3f3] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] text-[#5d6670]">
                            {item.day}
                            {item.time ? ` · ${item.time}` : ""} · {item.minutes} min
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">{item.focus}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="grid min-h-[560px] place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5e9ff] text-brand">
                  <Sparkles size={21} />
                </span>
                <h3 className="mt-5 text-lg font-black">Your week will appear here</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                  Add your subjects, describe any commitments and choose honest confidence levels. StudyWith will turn
                  that into a planned calendar.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function normaliseConfidence(value: number) {
  if (value <= 2) return 1;
  if (value >= 4) return 5;
  return 3;
}
