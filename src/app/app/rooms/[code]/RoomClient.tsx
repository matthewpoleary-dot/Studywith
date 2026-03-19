"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Upload, Loader2, Users, BookOpen, ArrowRight, Trash2, ChevronDown, FileText, File, Presentation, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Assignment = {
  id: string;
  title: string;
  content: string;
  image_base64?: string | null;
  image_mime?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
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

const ACCEPTED_TYPES = [
  "image/*",
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
].join(",");

function fileIcon(type: string | null | undefined) {
  if (!type) return <File className="w-4 h-4" strokeWidth={1.5} />;
  if (type.startsWith("image/")) return <FileText className="w-4 h-4" strokeWidth={1.5} />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" strokeWidth={1.5} />;
  if (type.includes("presentation") || type.includes("powerpoint")) return <Presentation className="w-4 h-4 text-orange-500" strokeWidth={1.5} />;
  return <File className="w-4 h-4 text-blue-500" strokeWidth={1.5} />;
}

function fileLabel(type: string | null | undefined, name: string | null | undefined): string {
  if (!type) return name ?? "File";
  if (type.startsWith("image/")) return "Image";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("presentation") || type.includes("powerpoint")) return "Presentation";
  if (type.includes("word")) return "Document";
  return name ?? "File";
}

export default function RoomClient({ code, userId, userEmail }: Props) {
  const router = useRouter();
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload assignment state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignContent, setAssignContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  const void_unused = userId + userEmail;
  void void_unused;

  useEffect(() => { void fetchRoom(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    // Preview for images only
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    // Auto-fill title if empty
    if (!assignTitle.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      setAssignTitle(nameWithoutExt);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadAssignment = async () => {
    if (!assignTitle.trim() || !data) return;
    setUploading(true);
    setUploadError(null);

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    // Upload file to Supabase Storage if one is selected
    if (selectedFile) {
      setUploadProgress("Uploading file...");
      try {
        const supabase = createSupabaseBrowserClient();
        const ext = selectedFile.name.split(".").pop() ?? "bin";
        const path = `${data.room.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: storageErr } = await supabase.storage
          .from("room-files")
          .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });
        if (storageErr) throw new Error(storageErr.message);
        const { data: urlData } = supabase.storage.from("room-files").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "File upload failed");
        setUploading(false);
        setUploadProgress(null);
        return;
      }
    }

    setUploadProgress("Saving assignment...");
    try {
      const res = await fetch("/api/rooms/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: data.room.id,
          title: assignTitle,
          content: assignContent,
          ...(fileUrl ? { fileUrl, fileName, fileType } : {}),
        }),
      });
      const result = (await res.json()) as { assignment?: Assignment; error?: string };
      if (result.error) { setUploadError(result.error); return; }
      if (result.assignment) {
        // Merge the file info that the API response might not have
        const full = { ...result.assignment, file_url: fileUrl, file_name: fileName, file_type: fileType };
        setData((prev) => prev ? { ...prev, assignments: [full, ...prev.assignments] } : prev);
        setAssignTitle("");
        setAssignContent("");
        clearFile();
        setUploadOpen(false);
      }
    } catch {
      setUploadError("Something went wrong.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const startSession = (assignment: Assignment) => {
    const parts = [assignment.title, assignment.content].filter(Boolean);
    if (assignment.file_url) parts.push(`[Attached file: ${assignment.file_name ?? assignment.file_url}]`);
    const encoded = encodeURIComponent(parts.join("\n\n").slice(0, 4000));
    router.push(`/app/new?prefill=${encoded}`);
  };

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
          <Link href="/app/rooms" className="text-sm text-[#57534E] hover:text-[#1A1A1A] underline">Back to rooms</Link>
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
          <Link href="/app/rooms" className="text-xs text-[#A8A29E] hover:text-[#57534E] transition mb-4 inline-block">
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
                <span>{isTeacher ? "Teacher view" : "Student view"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">

          {/* Assignments */}
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

            {/* Upload form */}
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
                  placeholder="Paste instructions or description here (optional if attaching a file)..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                />

                {/* File picker */}
                {!selectedFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E7E5E4] rounded-xl py-6 text-sm text-[#A8A29E] hover:border-[#D97706]/40 hover:text-[#57534E] transition cursor-pointer"
                  >
                    <Upload className="w-5 h-5" strokeWidth={1.5} />
                    <span>Click to attach a file</span>
                    <span className="text-xs">Images, PDF, PowerPoint, Word, text</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-[#F5F4F0] border border-[#E7E5E4] rounded-xl px-4 py-3">
                    {fileIcon(selectedFile.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{selectedFile.name}</p>
                      <p className="text-xs text-[#A8A29E]">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {filePreview && (
                      <img src={filePreview} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#E7E5E4]" />
                    )}
                    <button onClick={clearFile} className="shrink-0 text-[#A8A29E] hover:text-red-400 transition">
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {uploadProgress && (
                  <p className="text-xs text-[#D97706] flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> {uploadProgress}
                  </p>
                )}
                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => void handleUploadAssignment()}
                    disabled={!assignTitle.trim() || uploading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#1A1A1A]/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post assignment"}
                  </button>
                  <button
                    onClick={() => { setUploadOpen(false); setAssignTitle(""); setAssignContent(""); clearFile(); setUploadError(null); }}
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F5F4F0] flex items-center justify-center shrink-0">
                          {fileIcon(a.file_type ?? a.image_mime)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{a.title}</p>
                          <p className="text-xs text-[#A8A29E] mt-0.5">
                            {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {(a.file_name ?? a.image_mime) && (
                              <span> &middot; {fileLabel(a.file_type ?? a.image_mime, a.file_name)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#A8A29E] transition-transform duration-200 shrink-0 ${expandedAssignment === a.id ? "rotate-180" : ""}`}
                        strokeWidth={1.5}
                      />
                    </button>

                    {expandedAssignment === a.id && (
                      <div className="px-5 pb-5 border-t border-[#E7E5E4] pt-4 space-y-4">
                        {a.content && (
                          <p className="text-sm text-[#57534E] leading-relaxed whitespace-pre-wrap">{a.content}</p>
                        )}

                        {/* Render file based on type */}
                        {a.file_url && (
                          <div>
                            {a.file_type?.startsWith("image/") ? (
                              <img
                                src={a.file_url}
                                alt={a.file_name ?? "Assignment image"}
                                className="rounded-xl border border-[#E7E5E4] max-w-full"
                              />
                            ) : a.file_type?.includes("pdf") ? (
                              <div className="space-y-3">
                                <object
                                  data={`${a.file_url!}#toolbar=1&view=FitH`}
                                  type="application/pdf"
                                  className="w-full rounded-xl border border-[#E7E5E4]"
                                  style={{ height: "520px" }}
                                >
                                  {/* Fallback for browsers that can't embed PDFs */}
                                  <div className="flex flex-col items-center justify-center h-40 bg-[#F5F4F0] rounded-xl gap-3">
                                    <FileText className="w-8 h-8 text-red-400" strokeWidth={1.5} />
                                    <p className="text-sm text-[#57534E]">PDF cannot be previewed here.</p>
                                  </div>
                                </object>
                                <a
                                  href={a.file_url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 border border-[#1A1A1A] text-[#1A1A1A] rounded-full px-4 py-1.5 text-xs font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-200"
                                >
                                  <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  Open PDF in new tab
                                </a>
                              </div>
                            ) : (
                              <a
                                href={a.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#F5F4F0] transition"
                              >
                                {fileIcon(a.file_type)}
                                <span className="flex-1">{a.file_name ?? "Download file"}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={1.5} />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Legacy base64 image support */}
                        {!a.file_url && a.image_base64 && (
                          <img
                            src={`data:${a.image_mime ?? "image/jpeg"};base64,${a.image_base64}`}
                            alt="Assignment"
                            className="rounded-xl border border-[#E7E5E4] max-w-full"
                          />
                        )}

                        <div className="flex items-center gap-3 pt-1">
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
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Student activity (teacher only) */}
          {isTeacher && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                Student activity
              </p>
              {members.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E7E5E4] rounded-2xl p-8 text-center">
                  <p className="text-sm text-[#A8A29E]">
                    No students have joined yet. Share the room code:{" "}
                    <span className="font-mono font-bold">{room.code}</span>
                  </p>
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
