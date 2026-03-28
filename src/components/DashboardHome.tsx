"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Layers, ChevronRight, FileText } from "lucide-react";

interface SessionRow {
  id: string;
  assignment_text: string;
  title: string | null;
  created_at: string;
  receipt: unknown | null;
}

interface StudyMaterial {
  id: string;
  file_name: string;
  topic: string | null;
  created_at: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function DashboardHome() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, mRes] = await Promise.all([
          fetch("/api/sessions"),
          fetch("/api/study-materials"),
        ]);
        const [sData, mData] = await Promise.all([sRes.json(), mRes.json()]);
        setSessions((sData?.sessions as SessionRow[]) || []);
        setMaterials((mData?.materials as StudyMaterial[]) || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const inProgress = sessions.filter((s) => s.receipt === null);
  const recent = sessions.slice(0, 6);
  const recentMaterials = materials.slice(0, 4);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 md:py-14 space-y-10">

        {/* Greeting */}
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-1">
            {getGreeting()}
          </h1>
          <p className="text-[#57534E]">What would you like to do today?</p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/app/new"
            className="group rounded-2xl border border-[#E7E5E4] bg-white p-6 hover:border-[#D97706]/50 hover:shadow-md transition"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 mb-4">
              <MessageSquare className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
            </div>
            <h2 className="font-medium text-[#1A1A1A] mb-1">AI Tutor</h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Ask a question, work through an assignment, or get help with anything you&apos;re studying.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#D97706] group-hover:gap-2 transition-all">
              Start session <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
          </Link>

          <Link
            href="/app/study-materials"
            className="group rounded-2xl border border-[#E7E5E4] bg-white p-6 hover:border-[#D97706]/50 hover:shadow-md transition"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 mb-4">
              <Layers className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
            </div>
            <h2 className="font-medium text-[#1A1A1A] mb-1">Learning Materials</h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Upload notes or PDFs and get AI-generated flashcards and practice quizzes.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#D97706] group-hover:gap-2 transition-all">
              View materials <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
          </Link>
        </div>

        {/* Continue learning */}
        {!loading && inProgress.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
              Continue learning
            </h2>
            <div className="space-y-1.5">
              {inProgress.slice(0, 3).map((s) => {
                const label = s.title ?? s.assignment_text;
                return (
                  <Link
                    key={s.id}
                    href={`/app/session/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 hover:border-[#D97706]/40 hover:shadow-sm transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className="w-4 h-4 text-[#D97706] shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-[#1A1A1A] truncate">{label.length > 60 ? label.slice(0, 60) + "…" : label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[#A8A29E]">{relativeTime(s.created_at)}</span>
                      <ChevronRight className="w-4 h-4 text-[#C8C4C0] group-hover:text-[#D97706] transition" strokeWidth={1.5} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent sessions */}
        {!loading && recent.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Recent sessions</h2>
              <Link
                href="/app/new"
                className="text-xs text-[#D97706] hover:underline flex items-center gap-0.5"
              >
                New session <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
            <div className="rounded-xl border border-[#E7E5E4] bg-white overflow-hidden divide-y divide-[#F5F4F0]">
              {recent.map((s) => {
                const label = s.title ?? s.assignment_text;
                const done = s.receipt !== null;
                return (
                  <Link
                    key={s.id}
                    href={`/app/session/${s.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FAFAF8] transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${done ? "bg-[#D1D5DB]" : "bg-[#D97706]"}`} />
                      <span className="text-sm text-[#1A1A1A] truncate">{label.length > 60 ? label.slice(0, 60) + "…" : label}</span>
                    </div>
                    <span className="text-xs text-[#A8A29E] shrink-0">{relativeTime(s.created_at)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Study materials */}
        {!loading && recentMaterials.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Study materials</h2>
              <Link
                href="/app/study-materials"
                className="text-xs text-[#D97706] hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentMaterials.map((m) => (
                <Link
                  key={m.id}
                  href="/app/study-materials"
                  className="rounded-xl border border-[#E7E5E4] bg-white p-4 hover:border-[#D97706]/40 hover:shadow-sm transition"
                >
                  <FileText className="w-4 h-4 text-[#D97706] mb-2.5" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-[#1A1A1A] leading-snug line-clamp-2">
                    {m.topic || m.file_name}
                  </p>
                  {m.topic && (
                    <p className="text-xs text-[#A8A29E] mt-1 truncate">{m.file_name}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && materials.length === 0 && (
          <div className="rounded-2xl border border-[#E7E5E4] bg-white px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 mb-5 text-2xl">
              📚
            </div>
            <h2 className="font-serif text-xl font-medium text-[#1A1A1A] mb-2">Ready when you are</h2>
            <p className="text-sm text-[#57534E] max-w-xs mx-auto leading-relaxed">
              Use the AI Tutor for a tutoring session, or upload notes in Learning Materials to get flashcards and quizzes.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-[#F5F4F0] animate-pulse" />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
