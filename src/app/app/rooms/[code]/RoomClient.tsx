"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Upload, Loader2, Users, BookOpen, ArrowRight, Trash2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

type Assignment = {
  id: string;
  title: string;
  content: string;
  image_base64?: string | null;
  image_mime?: string | null;
  created_at: string;
};

type Member = {
  user_id: string;
  email: string;
  grit_streak: number;
  total_grit_points: number;
  latest_score: number | null;
  latest_session_at: string | null;
};

type RoomData = {
  room: { id: string; code: string; name: string; teacher_id: string };
  assignments: Assignment[];
  members: Member[];
  isTeacher: boolean;
};

type Props = { code: string; userId: string; userEmail: string };

export default function RoomClient({ code, userId, userEmail }: Props) {
  const router = useRouter();
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload assignment state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignContent, setAssignContent] = useState("");
  const [assignImage, setAssignImage] = useState<{ base64: string; mime: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  // Load room data
  useEffect(() => {
    void fetchRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const fetchRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/detail?code=${code}`);
      if (res.status === 404) { setError("Room not found."); return; }
      const d = (await res.json()) as RoomData & { error?: string };
      if (d.error) { setError(d.error); return; }
      setData(d);
    } catch {
      setError("Failed to load room.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setAssignImage({ base64, mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAssignment = async () => {
    if (!assignTitle.trim() || !data) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/rooms/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: data.room.id,
          title: assignTitle,
          content: assignContent,
          ...(assignImage ? { imageBase64: assignImage.base64, imageMime: assignImage.mime } : {}),
        }),
      });
      const result = (await res.json()) as { assignment?: Assignment; error?: string };
      if (result.error) { setUploadError(result.error); return; }
      if (result.assignment) {
        setData((prev) => prev ? {
          ...prev,
          assignments: [result.assignment!, ...prev.assignments],
        } : prev);
        setAssignTitle("");
        setAssignContent("");
        setAssignImage(null);
        setUploadOpen(false);
      }
    } catch {
      setUploadError("Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  // Student: start a session with this assignment pre-loaded
  const startSession = (assignment: Assignment) => {
    const context = [
      assignment.title,
      assignment.content,
    ].filter(Boolean).join("\n\n");
    const encoded = encodeURIComponent(context.slice(0, 4000));
    router.push(`/app/new?prefill=${encoded}`);
  };

  const void_unused = userId + userEmail; // suppress unused warning
  void void_unused;

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
          <p className="text-sm text-red-500 mb-4">{error ?? "Could not load room."}</p>
          <Link href="/app/rooms" className="text-sm text-[#57534E] hover:text-[#1A1A1A] underline">
            Back to rooms
          </Link>
        </div>
      </div>
    );
  }

  const { room, assignments, members, isTeacher } = data;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-14">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app/rooms"
            className="text-xs text-[#A8A29E] hover:text-[#57534E] transition mb-4 inline-block"
          >
            &larr; Back to rooms
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A]">{room.name}</h1>
              <p className="text-sm text-[#A8A29E] mt-1.5">
                Room code:{" "}
                <span className="font-mono font-bold text-[#1A1A1A] tracking-widest bg-[#E7E5E4] rounded-lg px-2 py-0.5">
                  {room.code}
                </span>
                {" "}&middot;{" "}
                <span className="capitalize">{isTeacher ? "Teacher view" : "Student view"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">

          {/* Assignments section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                Assignments
              </p>
              {isTeacher && (
                <button
                  onClick={() => setUploadOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 border border-[#1A1A1A] text-[#1A1A1A] rounded-full px-3 py-1 text-xs font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-200"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  Add assignment
                </button>
              )}
            </div>

            {/* Upload form (teacher only) */}
            {isTeacher && uploadOpen && (
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 mb-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">New assignment</p>
                <input
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Assignment title"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                />
                <textarea
                  value={assignContent}
                  onChange={(e) => setAssignContent(e.target.value)}
                  placeholder="Paste assignment text or instructions here..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 border border-[#E7E5E4] text-[#57534E] rounded-xl px-3 py-2 text-xs font-medium hover:bg-[#F5F4F0] transition"
                  >
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {assignImage ? "Image attached" : "Attach image"}
                  </button>
                  {assignImage && (
                    <button onClick={() => setAssignImage(null)} className="text-xs text-red-400 hover:text-red-500">
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleUploadAssignment()}
                    disabled={!assignTitle.trim() || uploading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#1A1A1A]/80 transition disabled:opacity-40"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post assignment"}
                  </button>
                  <button
                    onClick={() => { setUploadOpen(false); setAssignTitle(""); setAssignContent(""); setAssignImage(null); }}
                    className="px-4 py-2 rounded-xl border border-[#E7E5E4] text-sm text-[#57534E] hover:bg-[#F5F4F0] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Assignment list */}
            {assignments.length === 0 ? (
              <div className="bg-white border border-dashed border-[#E7E5E4] rounded-2xl p-8 text-center">
                <p className="text-sm text-[#A8A29E]">
                  {isTeacher ? "No assignments yet. Add one above." : "Your teacher hasn't posted any assignments yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="bg-white border border-[#E7E5E4] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedAssignment((prev) => prev === a.id ? null : a.id)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#F5F4F0] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{a.title}</p>
                        <p className="text-xs text-[#A8A29E] mt-0.5">
                          {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isTeacher && (
                          <span className="text-xs font-medium text-[#D97706]">Start</span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-[#A8A29E] transition-transform duration-200 ${
                            expandedAssignment === a.id ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.5}
                        />
                      </div>
                    </button>

                    {expandedAssignment === a.id && (
                      <div className="px-5 pb-5 border-t border-[#E7E5E4] pt-4 space-y-4">
                        {a.content && (
                          <p className="text-sm text-[#57534E] leading-relaxed whitespace-pre-wrap">{a.content}</p>
                        )}
                        {a.image_base64 && (
                          <img
                            src={`data:${a.image_mime ?? "image/jpeg"};base64,${a.image_base64}`}
                            alt="Assignment"
                            className="rounded-xl border border-[#E7E5E4] max-w-full"
                          />
                        )}
                        {!isTeacher && (
                          <button
                            onClick={() => startSession(a)}
                            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.01]"
                          >
                            Start with Sage
                            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        )}
                        {isTeacher && (
                          <button className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition">
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                            Remove assignment
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live feed (teacher only) */}
          {isTeacher && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                Student activity
              </p>
              {members.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E7E5E4] rounded-2xl p-8 text-center">
                  <p className="text-sm text-[#A8A29E]">No students have joined yet. Share the room code: <span className="font-mono font-bold">{room.code}</span></p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(members as Member[]).map((member) => (
                    <div key={member.user_id} className="bg-white border border-[#E7E5E4] rounded-2xl px-5 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#E7E5E4] flex items-center justify-center text-xs font-semibold text-[#57534E] shrink-0">
                        {member.email.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{member.email}</p>
                        <p className="text-xs text-[#A8A29E] mt-0.5">
                          {member.latest_score !== null ? (
                            <span className={`font-medium ${member.latest_score >= 75 ? "text-emerald-600" : member.latest_score >= 50 ? "text-[#D97706]" : "text-red-500"}`}>
                              Last score: {member.latest_score}/100
                            </span>
                          ) : "No sessions yet"}
                          {member.latest_session_at && (
                            <span> &middot; {new Date(member.latest_session_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        {member.grit_streak > 0 && (
                          <span className="text-xs font-medium text-[#D97706]">🔥 {member.grit_streak}</span>
                        )}
                        {member.total_grit_points > 0 && (
                          <span className="text-xs text-[#A8A29E]">{member.total_grit_points} grit</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
