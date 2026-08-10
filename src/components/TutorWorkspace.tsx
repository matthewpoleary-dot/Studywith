"use client";

import Link from "next/link";
import type { ChatStatus, FileUIPart } from "ai";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Camera,
  Check,
  Copy,
  FileText,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { uploadStudyFileParts, discardPendingUploads } from "@/lib/study-upload-browser";
import type { PendingStudyUpload } from "@/lib/study-file-shared";
import { TooltipProvider } from "@/components/ui/tooltip";

type TutorAttachment = {
  id: string;
  kind: "file" | "material";
  name: string;
  mimeType: string;
  size: number;
  url?: string;
};

type TutorMessage = { role: "student" | "tutor"; content: string; attachments?: TutorAttachment[] };
type Session = { id: string; title: string; subject: string; messages: TutorMessage[] };
type MaterialOption = { id: string; title: string; subject: string };

const subjects = ["Auto-detect", "Maths", "English", "Irish", "Biology", "Chemistry", "Physics", "History", "Geography", "Business", "Economics", "Other"];
const starters = [
  { icon: Camera, label: "Photograph a question", prompt: "Help me work through the question in this photo. Start by checking what I have tried." },
  { icon: Brain, label: "Explain a difficult idea", prompt: "Explain this concept clearly, then ask me one question to check I understand it:" },
  { icon: Check, label: "Check my attempt", prompt: "Check my attempt and tell me the first step that needs attention. Do not rewrite the whole answer:" },
];

export function TutorWorkspace(props: { initialSessions: Session[]; materials: MaterialOption[]; userId: string; initialMaterialId?: string }) {
  return (
    <TooltipProvider>
      <PromptInputProvider>
        <TutorWorkspaceInner {...props} />
      </PromptInputProvider>
    </TooltipProvider>
  );
}

function TutorWorkspaceInner({ initialSessions, materials, userId, initialMaterialId }: { initialSessions: Session[]; materials: MaterialOption[]; userId: string; initialMaterialId?: string }) {
  const promptController = usePromptInputController();
  const [sessions, setSessions] = useState(initialSessions);
  const [activeId, setActiveId] = useState(initialSessions[0]?.id ?? "");
  const [subject, setSubject] = useState(initialSessions[0]?.subject ?? "Auto-detect");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [notice, setNotice] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(() => materials.find((item) => item.id === initialMaterialId) ?? null);
  const [showMaterials, setShowMaterials] = useState(false);
  const active = sessions.find((session) => session.id === activeId);
  const busy = status === "submitted" || status === "streaming";

  function newSession() {
    if (busy) return;
    setActiveId("");
    setSelectedMaterial(null);
    setNotice("");
    promptController.textInput.clear();
  }

  async function removeSession(session: Session) {
    if (busy || !window.confirm(`Delete “${session.title}” and its uploaded files?`)) return;
    const response = await fetch(`/api/tutor/${session.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setNotice(body?.error ?? "The session could not be deleted.");
      return;
    }
    const next = sessions.filter((item) => item.id !== session.id);
    setSessions(next);
    if (activeId === session.id) {
      setActiveId(next[0]?.id ?? "");
      setSubject(next[0]?.subject ?? "Auto-detect");
    }
  }

  async function submit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text && !message.files.length && !selectedMaterial) {
      setNotice("Add a question, photo, screenshot, file or saved note first.");
      throw new Error("Empty message");
    }
    const before = sessions;
    const beforeActiveId = activeId;
    const draftId = active?.id ?? `draft-${crypto.randomUUID()}`;
    const optimisticAttachments: TutorAttachment[] = [
      ...message.files.map((file, index) => ({
        id: `local-${index}`,
        kind: "file" as const,
        name: file.filename || "Study file",
        mimeType: file.mediaType || "application/octet-stream",
        size: 0,
        url: file.url,
      })),
      ...(selectedMaterial
        ? [{ id: selectedMaterial.id, kind: "material" as const, name: selectedMaterial.title, mimeType: "application/x-studywith-material", size: 0 }]
        : []),
    ];
    const optimisticStudent: TutorMessage = {
      role: "student",
      content: text || (selectedMaterial ? `Help me study from ${selectedMaterial.title}.` : "Help me understand the attached work."),
      ...(optimisticAttachments.length ? { attachments: optimisticAttachments } : {}),
    };
    const baseMessages = active?.messages ?? [];
    const optimistic: Session = {
      id: draftId,
      title: active?.title ?? (text || selectedMaterial?.title || message.files[0]?.filename || "Study session").slice(0, 64),
      subject,
      messages: [...baseMessages, optimisticStudent, { role: "tutor", content: "" }],
    };
    setSessions((items) => [optimistic, ...items.filter((item) => item.id !== draftId)]);
    setActiveId(draftId);
    setNotice("");
    setStatus("submitted");

    let uploads: PendingStudyUpload[] = [];
    try {
      if (message.files.length) {
        uploads = await uploadStudyFileParts(userId, message.files, (current, total) => setUploadProgress(`Securing file ${current} of ${total}…`));
      }
      setUploadProgress("");
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: active?.id,
          subject,
          text,
          materialId: selectedMaterial?.id,
          uploads,
        }),
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        await discardPendingUploads(uploads);
        throw new Error(body?.error ?? "The tutor could not respond. Try again.");
      }

      setStatus("streaming");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalSession: Session | null = null;
      let remaining: number | null = null;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          if (!raw.trim()) continue;
          const event = JSON.parse(raw) as { type: "delta" | "done" | "error"; content?: string; session?: Session; remaining?: number | null; error?: string };
          if (event.type === "delta" && event.content) {
            setSessions((items) =>
              items.map((item) =>
                item.id === draftId
                  ? { ...item, messages: item.messages.map((part, index) => (index === item.messages.length - 1 ? { ...part, content: part.content + event.content } : part)) }
                  : item,
              ),
            );
          } else if (event.type === "done" && event.session) {
            finalSession = event.session;
            remaining = event.remaining ?? null;
          } else if (event.type === "error") {
            throw new Error(event.error ?? "The tutor stream stopped unexpectedly.");
          }
        }
        if (done) break;
      }
      if (!finalSession) throw new Error("The tutor response did not finish saving.");
      const saved = finalSession as Session;
      setSessions((items) => [saved, ...items.filter((item) => item.id !== draftId && item.id !== saved.id)]);
      setActiveId(saved.id);
      setSelectedMaterial(null);
      if (typeof remaining === "number") setNotice(`${remaining} included AI action${remaining === 1 ? "" : "s"} remaining.`);
      setStatus("ready");
    } catch (error) {
      setSessions(before);
      setActiveId(beforeActiveId);
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "The tutor could not respond. Try again.");
      setUploadProgress("");
      throw error;
    }
  }

  const messageCount = active?.messages.length ?? 0;
  return (
    <div className="overflow-hidden rounded-[30px] border border-line bg-paper-strong shadow-[0_24px_70px_rgba(16,24,32,.08)]">
      <div className="grid min-h-[calc(100vh-128px)] lg:grid-cols-[278px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-[#f2f3f3] p-3 lg:border-b-0 lg:border-r">
          <button
            type="button"
            onClick={newSession}
            disabled={busy}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#23303a] disabled:bg-[#cbd0d3] disabled:text-[#687177]"
          >
            <Plus size={17} /> New conversation
          </button>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto lg:pb-0">
            {sessions.length ? (
              sessions.filter((session) => !session.id.startsWith("draft-") || session.id === activeId).map((session) => (
                <div key={session.id} className={`group relative min-w-56 rounded-2xl border transition lg:min-w-0 ${session.id === activeId ? "border-line bg-white shadow-sm" : "border-transparent hover:border-line hover:bg-white/70"}`}>
                  <button
                    type="button"
                    onClick={() => { setActiveId(session.id); setSubject(session.subject); setNotice(""); }}
                    className="w-full px-3.5 py-3.5 pr-10 text-left"
                  >
                    <p className="truncate text-sm font-extrabold text-ink">{session.title}</p>
                    <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.12em] text-muted">{session.subject} · {Math.ceil(session.messages.length / 2)} turns</p>
                  </button>
                  {!session.id.startsWith("draft-") ? (
                    <button
                      type="button"
                      onClick={() => void removeSession(session)}
                      aria-label={`Delete ${session.title}`}
                      className="absolute right-2 top-3 rounded-lg p-2 text-[#8b9398] opacity-100 transition hover:bg-red-50 hover:text-red-700 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-white/55 p-4 text-xs leading-5 text-muted">Your conversations will be saved here automatically.</div>
            )}
          </div>
          <div className="mt-4 hidden rounded-2xl bg-[#e5e9ff] p-4 lg:block">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#173ecc]"><ImagePlus size={15} /> Photos work here</div>
            <p className="mt-2 text-xs leading-5 text-[#4a5561]">Upload a question, handwritten attempt, diagram or screenshot. StudyWith reads it and keeps it private.</p>
          </div>
        </aside>

        <section className="relative flex min-h-[700px] min-w-0 flex-col bg-[#fffdf9]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_8px_20px_rgba(36,87,255,.22)]"><Brain size={19} /></span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-black md:text-base">StudyWith Tutor</h1>
                <p className="truncate text-[11px] text-muted">Understands photos and files · Guides your thinking</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-muted">
              Subject
              <select value={subject} onChange={(event) => setSubject(event.target.value)} disabled={busy} className="focus-ring rounded-xl border border-line bg-white px-3 py-2 text-sm font-extrabold text-ink outline-none disabled:bg-[#edf0f1] disabled:text-[#8b9398]">
                {subjects.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </header>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent className={`mx-auto w-full max-w-3xl px-5 py-8 md:px-8 ${messageCount ? "gap-7" : "h-full"}`}>
              {!active?.messages.length ? (
                <ConversationEmptyState className="min-h-[430px] px-0" icon={<span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e5e9ff] text-brand"><Sparkles size={23} /></span>}>
                  <div className="max-w-xl">
                    <h2 className="display text-4xl tracking-[-.035em] md:text-5xl">Bring what you&apos;re working on.</h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">Type a question, add a photo of your page, upload a screenshot or attach saved notes. The tutor will work from your actual material.</p>
                    <div className="mt-7 grid gap-2 sm:grid-cols-3">
                      {starters.map(({ icon: Icon, label, prompt }) => (
                        <button key={label} type="button" onClick={() => promptController.textInput.setInput(prompt)} className="focus-ring rounded-2xl border border-line bg-white p-4 text-left text-xs font-extrabold text-ink transition hover:border-brand hover:shadow-sm">
                          <Icon size={17} className="mb-3 text-brand" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                </ConversationEmptyState>
              ) : (
                active.messages.map((message, index) => (
                  <Message key={`${active.id}-${index}`} from={message.role === "student" ? "user" : "assistant"} className={message.role === "student" ? "max-w-[88%]" : "max-w-full"}>
                    {message.attachments?.length ? <MessageAttachments attachments={message.attachments} /> : null}
                    <MessageContent className={message.role === "student" ? "rounded-[20px] rounded-tr-md bg-ink px-4 py-3 text-white" : "w-full bg-transparent px-0 py-0 text-[15px] leading-7"}>
                      {message.role === "tutor" ? (
                        message.content ? <MessageResponse className="prose-p:leading-7">{message.content}</MessageResponse> : <span className="flex items-center gap-2 text-sm font-bold text-muted"><LoaderCircle className="animate-spin" size={15} /> Reading your work and choosing the next useful step…</span>
                      ) : <p className="whitespace-pre-wrap">{message.content}</p>}
                    </MessageContent>
                    {message.role === "tutor" && message.content ? (
                      <MessageActions>
                        <MessageAction label="Copy reply" tooltip="Copy reply" onClick={() => void navigator.clipboard.writeText(message.content)}><Copy size={14} /></MessageAction>
                      </MessageActions>
                    ) : null}
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton className="border-line bg-white text-ink shadow-md" />
          </Conversation>

          <div className="border-t border-line bg-white/92 p-3 backdrop-blur md:p-4">
            <div className="relative mx-auto max-w-3xl">
              {showMaterials ? (
                <div className="absolute bottom-[calc(100%+10px)] left-0 z-30 w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-ink/15">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <div><p className="text-xs font-black">Use saved notes</p><p className="mt-0.5 text-[10px] text-muted">Adds the extracted notes as tutor context</p></div>
                    <button type="button" onClick={() => setShowMaterials(false)} className="rounded-lg p-1 text-muted"><MoreHorizontal size={17} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {materials.length ? materials.map((material) => (
                      <button key={material.id} type="button" onClick={() => { setSelectedMaterial(material); setShowMaterials(false); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-[#f2f3f3]">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6f7ef] text-[#087451]"><FileText size={16} /></span>
                        <span className="min-w-0"><strong className="block truncate text-xs">{material.title}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{material.subject}</span></span>
                      </button>
                    )) : <div className="p-5 text-center"><p className="text-xs text-muted">No saved notes yet.</p><Link href="/app/materials" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-brand">Add notes <ArrowUpRight size={13} /></Link></div>}
                  </div>
                </div>
              ) : null}

              <PromptInput
                accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                multiple
                maxFiles={5}
                maxFileSize={8_000_000}
                onError={(error) => setNotice(error.message)}
                onSubmit={submit}
                className="rounded-[22px] border border-[#cdd2d5] bg-white shadow-[0_8px_24px_rgba(16,24,32,.06)] focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10"
              >
                <PromptInputHeader className="px-3 pt-3">
                  <ComposerAttachments />
                  {selectedMaterial ? (
                    <span className="flex max-w-full items-center gap-2 rounded-xl border border-[#cfe6dc] bg-[#edf9f4] px-3 py-2 text-xs font-bold text-[#086348]">
                      <BookOpen size={14} /><span className="truncate">{selectedMaterial.title}</span>
                      <button type="button" aria-label="Remove saved notes" onClick={() => setSelectedMaterial(null)} className="ml-1 rounded p-0.5 hover:bg-black/5">×</button>
                    </span>
                  ) : null}
                </PromptInputHeader>
                <PromptInputBody>
                  <PromptInputTextarea disabled={busy} placeholder="Ask about a topic, or add a photo of the work you want help with…" className="min-h-20 px-4 py-3 text-[15px] leading-6" />
                </PromptInputBody>
                <PromptInputFooter className="px-2.5 pb-2.5">
                  <PromptInputTools>
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger tooltip="Add study material" className="rounded-xl border border-line bg-[#f6f7f7] text-ink hover:bg-[#e9edef]"><Plus size={17} /><span className="hidden text-xs font-bold sm:inline">Add</span></PromptInputActionMenuTrigger>
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments label="Photo, scan or file" />
                        <PromptInputActionAddScreenshot label="Take a screenshot" />
                        <button type="button" onClick={() => setShowMaterials(true)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-[#f2f3f3]"><BookOpen size={16} /> Use saved notes</button>
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                    <span className="hidden text-[11px] text-muted md:inline">JPG, PNG, WebP, PDF or TXT · 5 files max</span>
                  </PromptInputTools>
                  <PromptInputSubmit status={status} disabled={busy} className="h-9 w-9 rounded-xl bg-brand text-white shadow-sm hover:bg-[#173ecc] disabled:bg-[#cbd0d3] disabled:text-[#687177]" />
                </PromptInputFooter>
              </PromptInput>
              <div className="mt-2 flex min-h-5 items-center justify-between gap-3 px-1 text-[11px]">
                <p role="status" className={notice ? "font-bold text-[#5d6670]" : "text-muted"}>{uploadProgress || notice || "Enter sends · Shift + Enter adds a line"}</p>
                <p className="shrink-0 text-muted">Private to your account</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ComposerAttachments() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return (
    <Attachments variant="inline" className="w-full">
      {attachments.files.map((file) => (
        <Attachment key={file.id} data={file} onRemove={() => attachments.remove(file.id)} className="max-w-52 bg-[#f3f5f5] text-ink">
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

function MessageAttachments({ attachments }: { attachments: TutorAttachment[] }) {
  const files = useMemo(
    () => attachments.filter((item) => item.kind === "file").map((item): FileUIPart & { id: string } => ({ id: item.id, type: "file", filename: item.name, mediaType: item.mimeType, url: item.url || `/api/attachments/${encodeURIComponent(item.id)}` })),
    [attachments],
  );
  const materials = attachments.filter((item) => item.kind === "material");
  return (
    <div className="mb-1 flex flex-wrap justify-end gap-2">
      {files.length ? (
        <Attachments variant="inline">
          {files.map((file) => (
            <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="max-w-60">
              <Attachment data={file} className="bg-white text-ink shadow-sm"><AttachmentPreview /><AttachmentInfo /></Attachment>
            </a>
          ))}
        </Attachments>
      ) : null}
      {materials.map((material) => <span key={material.id} className="flex max-w-60 items-center gap-2 rounded-lg border border-[#cfe6dc] bg-[#edf9f4] px-2.5 py-1.5 text-xs font-bold text-[#086348]"><BookOpen size={13} /><span className="truncate">{material.name}</span></span>)}
    </div>
  );
}
