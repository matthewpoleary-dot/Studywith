"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Users, BarChart2, TrendingDown, CheckCircle } from "lucide-react";

type HeatmapEntry = { concept: string; avgScore: number; count: number };
type StudentRow = {
  userId: string;
  email: string;
  totalSessions: number;
  completedSessions: number;
  avgScore: number | null;
  latestSessionAt: string | null;
};
type AnalyticsData = {
  room: { id: string; name: string; code: string };
  heatmap: HeatmapEntry[];
  studentProgress: StudentRow[];
  totalSessions: number;
  completedSessions: number;
  avgRoomScore: number | null;
};

function scoreColor(score: number | null): string {
  if (score === null) return "text-[#A8A29E]";
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

export default function RoomAnalyticsClient({ code }: { code: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // First resolve code → room id via the detail endpoint
        const detailRes = await fetch(`/api/rooms/detail?code=${code}`);
        if (!detailRes.ok) { setError("Room not found or you are not the teacher."); return; }
        const detail = (await detailRes.json()) as { room?: { id: string }; isTeacher?: boolean; error?: string };
        if (!detail.isTeacher || !detail.room?.id) {
          setError("Only the room teacher can view analytics.");
          return;
        }
        const analyticsRes = await fetch(`/api/rooms/analytics?roomId=${detail.room.id}`);
        const analytics = (await analyticsRes.json()) as AnalyticsData & { error?: string };
        if (analytics.error) { setError(analytics.error); return; }
        setData(analytics);
      } catch {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [code]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#A8A29E] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">{error ?? "Could not load analytics."}</p>
          <Link href="/app/rooms" className="text-sm text-[#57534E] hover:text-[#1A1A1A] underline">
            Back to rooms
          </Link>
        </div>
      </div>
    );
  }

  const { room, heatmap, studentProgress, totalSessions, completedSessions, avgRoomScore } = data;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-14 space-y-8">

        {/* Header */}
        <div>
          <Link href={`/app/rooms/${code}`} className="text-xs text-[#A8A29E] hover:text-[#57534E] transition mb-4 inline-block">
            ← Back to room
          </Link>
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A]">{room.name}</h1>
          <p className="text-sm text-[#A8A29E] mt-1">Analytics dashboard · Teacher view</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-[#A8A29E]" strokeWidth={1.5} />
              <p className="text-[10px] font-medium text-[#57534E] uppercase tracking-wider">Sessions</p>
            </div>
            <p className="text-2xl font-serif font-medium text-[#1A1A1A]">{totalSessions}</p>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#A8A29E]" strokeWidth={1.5} />
              <p className="text-[10px] font-medium text-[#57534E] uppercase tracking-wider">Completed</p>
            </div>
            <p className="text-2xl font-serif font-medium text-[#1A1A1A]">{completedSessions}</p>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-[#A8A29E]" strokeWidth={1.5} />
              <p className="text-[10px] font-medium text-[#57534E] uppercase tracking-wider">Avg score</p>
            </div>
            <p className={`text-2xl font-serif font-medium ${scoreColor(avgRoomScore)}`}>
              {avgRoomScore !== null ? `${avgRoomScore}` : "--"}
              {avgRoomScore !== null && <span className="text-sm text-[#A8A29E]">/100</span>}
            </p>
          </div>
        </div>

        {/* Concept Heatmap */}
        <div>
          <h2 className="font-medium text-[#1A1A1A] mb-1">Concept heatmap</h2>
          <p className="text-xs text-[#A8A29E] mb-4">
            Concepts with the lowest average score across all sessions — these are your class&apos;s biggest gaps.
          </p>
          {heatmap.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E7E5E4] rounded-2xl p-8 text-center">
              <p className="text-sm text-[#A8A29E]">No completed sessions yet — check back after students finish their first session.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {heatmap.slice(0, 12).map((entry) => (
                <div key={entry.concept} className="bg-white border border-[#E7E5E4] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-[#1A1A1A] truncate flex-1 mr-4">{entry.concept}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[#A8A29E]">{entry.count}×</span>
                      <span className={`text-sm font-medium ${scoreColor(entry.avgScore)}`}>
                        {entry.avgScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBg(entry.avgScore)}`}
                      style={{ width: `${entry.avgScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Progress */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#A8A29E]" strokeWidth={1.5} />
            <h2 className="font-medium text-[#1A1A1A]">Student progress</h2>
          </div>
          {studentProgress.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E7E5E4] rounded-2xl p-8 text-center">
              <p className="text-sm text-[#A8A29E]">No students have joined this room yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {studentProgress.map((student) => {
                const lastDate = student.latestSessionAt
                  ? new Date(student.latestSessionAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : null;
                return (
                  <div key={student.userId} className="bg-white border border-[#E7E5E4] rounded-xl px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{student.email}</p>
                        <p className="text-xs text-[#A8A29E] mt-0.5">
                          {student.completedSessions} completed · {student.totalSessions} total
                          {lastDate && ` · Last: ${lastDate}`}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {student.avgScore !== null ? (
                          <span className={`text-sm font-semibold ${scoreColor(student.avgScore)}`}>
                            {student.avgScore}/100
                          </span>
                        ) : (
                          <span className="text-xs text-[#A8A29E]">No score yet</span>
                        )}
                      </div>
                    </div>
                    {student.avgScore !== null && (
                      <div className="mt-2 h-1 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBg(student.avgScore)}`}
                          style={{ width: `${student.avgScore}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
