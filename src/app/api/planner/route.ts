import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import type { Json } from "@/lib/database.types";
import { allocatePlannerSubjects, type PlannerSubject } from "@/lib/planner-allocation";

export const runtime = "nodejs";
export const maxDuration = 60;

type Subject = PlannerSubject;
type CalendarSlot = { day: string; time: string };
type BusyBlock = { day: string; start: number; end: number };

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const allowedMinutes = new Set([25, 40, 50, 60, 75, 90]);

function fallbackSlots(count: number): CalendarSlot[] {
  const occurrences = new Map<string, number>();
  return Array.from({ length: count }, (_, index) => {
    const day = days[Math.floor((index * days.length) / count)];
    const occurrence = occurrences.get(day) ?? 0;
    occurrences.set(day, occurrence + 1);
    const weekend = day === "Sat" || day === "Sun";
    const time = weekend
      ? ["11:00", "14:00", "16:30"][occurrence] ?? "18:30"
      : ["18:30", "20:00"][occurrence] ?? "16:30";
    return { day, time };
  });
}

const dayPatterns = [
  { day: "Mon", pattern: /\bmondays?\b|\bmon\b/i },
  { day: "Tue", pattern: /\btuesdays?\b|\btues?\b/i },
  { day: "Wed", pattern: /\bwednesdays?\b|\bweds?\b/i },
  { day: "Thu", pattern: /\bthursdays?\b|\bthurs?\b|\bthu\b/i },
  { day: "Fri", pattern: /\bfridays?\b|\bfri\b/i },
  { day: "Sat", pattern: /\bsaturdays?\b|\bsat\b/i },
  { day: "Sun", pattern: /\bsundays?\b|\bsun\b/i },
] as const;

function clockMinutes(hourText: string, minuteText = "0", period = "") {
  let hour = Number(hourText);
  const minute = Number(minuteText);
  const meridiem = period.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
  return hour * 60 + minute;
}

function parseWeeklyCommitments(value: string) {
  const blocks: BusyBlock[] = [];
  const unavailable = new Set<string>();
  let recognised = false;

  for (const sentence of value.split(/[\n.;]+/)) {
    const mentionedDays = dayPatterns.filter((item) => item.pattern.test(sentence)).map((item) => item.day);
    if (!mentionedDays.length) continue;

    if (/(?:can(?:not|'t)|unavailable|not available|no study|don'?t study)/i.test(sentence)) {
      mentionedDays.forEach((day) => unavailable.add(day));
      recognised = true;
      continue;
    }

    const range = sentence.match(/(?:from\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    const single = sentence.match(/\b(?:at|from)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let start: number | null = null;
    let end: number | null = null;

    if (range) {
      const sharedPeriod = range[3] || range[6] || "";
      start = clockMinutes(range[1], range[2], range[3] || sharedPeriod);
      end = clockMinutes(range[4], range[5], range[6] || sharedPeriod);
      if (end <= start) end += 12 * 60;
    } else if (single) {
      start = clockMinutes(single[1], single[2], single[3]);
      end = start + 120;
    } else if (/after school/i.test(sentence)) {
      start = 15 * 60 + 30;
      end = 18 * 60;
    }

    if (start !== null && end !== null) {
      mentionedDays.forEach((day) => blocks.push({ day, start, end }));
      recognised = true;
    }
  }

  return { blocks, unavailable, recognised };
}

function timeMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function candidateTimes(day: string) {
  return day === "Sat" || day === "Sun"
    ? ["10:00", "12:00", "14:30", "17:00", "19:00"]
    : ["16:30", "18:00", "19:30", "20:30"];
}

function planCalendarSlots(weeklyContext: string, count: number, minutes: number) {
  if (!weeklyContext) return { slots: fallbackSlots(count), summary: "" };

  const commitments = parseWeeklyCommitments(weeklyContext);
  const result: CalendarSlot[] = [];
  const seen = new Set<string>();

  function addFreeSlot(day: string) {
    if (commitments.unavailable.has(day)) return false;
    const time = candidateTimes(day).find((candidate) => {
      const key = `${day}-${candidate}`;
      if (seen.has(key)) return false;
      const start = timeMinutes(candidate);
      const end = start + minutes;
      return !commitments.blocks.some((block) => block.day === day && start < block.end && end > block.start);
    });
    if (!time) return false;
    seen.add(`${day}-${time}`);
    result.push({ day, time });
    return true;
  }

  for (const preferred of fallbackSlots(count)) {
    if (result.length === count) break;
    addFreeSlot(preferred.day);
  }

  const usedDays = new Set(result.map((slot) => slot.day));
  for (const day of days) {
    if (result.length === count) break;
    if (!usedDays.has(day) && addFreeSlot(day)) usedDays.add(day);
  }

  while (result.length < count) {
    const before = result.length;
    for (const day of days) {
      if (result.length === count) break;
      addFreeSlot(day);
    }
    if (result.length === before) break;
  }

  let usedDefaults = false;
  for (const fallback of fallbackSlots(count)) {
    if (result.length === count) break;
    const key = `${fallback.day}-${fallback.time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(fallback);
    usedDefaults = true;
  }

  const summary = commitments.recognised
    ? `Planned around the recurring days and times in your note.${usedDefaults ? " Some extra sessions use default times; review them before relying on the plan." : ""}`
    : "Your note was saved. Include day names and times for more precise scheduling.";
  return { slots: result, summary };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    examYear?: number;
    sessionsPerWeek?: number;
    sessionMinutes?: number;
    subjects?: Subject[];
    weeklyContext?: string;
  } | null;
  const examYear = Number(body?.examYear);
  const count = Number(body?.sessionsPerWeek);
  const minutes = Number(body?.sessionMinutes);
  const weeklyContext = String(body?.weeklyContext ?? "").trim().slice(0, 2_000);
  const subjects = (Array.isArray(body?.subjects) ? body.subjects : [])
    .map((item) => ({
      name: String(item.name ?? "").trim().slice(0, 60),
      confidence: Math.max(1, Math.min(5, Number(item.confidence) || 3)),
      priority: Math.max(1, Math.min(3, Number(item.priority) || 2)),
    }))
    .filter((item) => item.name)
    .slice(0, 12);

  if (examYear < 2026 || examYear > 2035 || count < 1 || count > 14 || !allowedMinutes.has(minutes) || !subjects.length) {
    return NextResponse.json({ error: "Check the year, available time and subject names." }, { status: 400 });
  }

  const assignments = allocatePlannerSubjects(subjects, count);
  const calendar = planCalendarSlots(weeklyContext, count, minutes);
  const schedule = assignments.map((subject, index) => {
    const slot = calendar.slots[index];
    const focus = subject.confidence <= 2
      ? "Rebuild one weak syllabus area, then answer two practice questions"
      : subject.priority === 3
        ? "Review the teacher-priority area and complete timed practice"
        : "Use active recall, then correct one gap from memory";
    return { ...slot, subject: subject.name, focus, minutes, status: "planned" as const };
  });

  const payload = {
    user_id: user.id,
    exam_type: "LC",
    exam_year: examYear,
    start_date: new Date().toISOString().slice(0, 10),
    sessions_per_week: count,
    session_duration_mins: minutes,
    subjects: subjects as unknown as Json,
    topics: { weeklyContext } as unknown as Json,
    schedule: schedule as unknown as Json,
  };
  const admin = createAdminSupabase();
  const { error } = await admin.from("study_plans").upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[planner] save failed", { userId: user.id, code: error.code, message: error.message });
    return NextResponse.json({ error: "Your plan was built but could not be saved. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ schedule, contextSummary: calendar.summary });
}
