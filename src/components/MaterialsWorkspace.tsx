"use client";

import Image from "next/image";
import Link from "next/link";
import type { FileUIPart } from "ai";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  Camera,
  CheckCircle2,
  FileImage,
  FileText,
  Images,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { discardPendingUploads, uploadStudyFileParts } from "@/lib/study-upload-browser";
import type { PendingStudyUpload } from "@/lib/study-file-shared";

type Card = { id: string; question: string; answer: string; topic: string; confidence: number };
type Question = { id: string; question: string; options: string[]; correct_index: number; explanation: string };
type MaterialAttachment = { id: string; kind: "file"; name: string; mimeType: string; size: number };
type Material = {
  id: string;
  title: string;
  subject: string;
  extracted_text: string;
  source_type: string;
  created_at: string;
  attachments: MaterialAttachment[];
  flashcards: Card[];
  quiz: Question[];
};

const subjects = ["Maths", "English", "Irish", "Biology", "Chemistry", "Physics", "History", "Geography", "Business", "Economics", "Other"];

export function MaterialsWorkspace({ initialMaterials, userId }: { initialMaterials: Material[]; userId: string }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [activeId, setActiveId] = useState(initialMaterials[0]?.id ?? "");
  const [adding, setAdding] = useState(initialMaterials.length === 0);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Biology");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<Array<FileUIPart & { id: string }>>([]);
  const [loading, setLoading] = useState("");
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"source" | "cards" | "quiz">("source");
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const active = useMemo(() => materials.find((item) => item.id === activeId), [materials, activeId]);

  function addFiles(list: FileList | File[]) {
    const incoming = [...list];
    setMessage("");
    setFiles((current) => {
      const room = Math.max(0, 5 - current.length);
      if (incoming.length > room) setMessage("You can add up to five files to one set of notes.");
      return [
        ...current,
        ...incoming.slice(0, room).map((file) => ({
          id: crypto.randomUUID(),
          type: "file" as const,
          filename: file.name,
          mediaType: file.type,
          url: URL.createObjectURL(file),
        })),
      ];
    });
  }

  function removeLocalFile(id: string) {
    setFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  }

  function clearDraft() {
    files.forEach((file) => file.url && URL.revokeObjectURL(file.url));
    setFiles([]);
    setTitle("");
    setNotes("");
    setMessage("");
    setProgress("");
  }

  async function saveMaterial(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || (!files.length && notes.trim().length < 20)) {
      setMessage("Add a title and either a photo, file or a few lines of notes.");
      return;
    }
    setLoading("save");
    setMessage("");
    let uploads: PendingStudyUpload[] = [];
    try {
      if (files.length) uploads = await uploadStudyFileParts(userId, files, (current, total) => setProgress(`Securing file ${current} of ${total}…`));
      setProgress(uploads.some((item) => item.mimeType.startsWith("image/")) ? "Reading handwriting and page structure…" : "Extracting your notes…");
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, notes, uploads }),
      });
      const body = (await response.json().catch(() => null)) as { material?: Material; error?: string } | null;
      if (!response.ok || !body?.material) {
        await discardPendingUploads(uploads);
        throw new Error(body?.error ?? "Could not save these notes.");
      }
      setMaterials((items) => [body.material!, ...items]);
      setActiveId(body.material.id);
      setAdding(false);
      setTab("source");
      clearDraft();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save these notes.");
    } finally {
      setLoading("");
      setProgress("");
    }
  }

  async function generate(kind: "cards" | "quiz") {
    if (!active) return;
    setLoading(kind);
    setMessage("");
    const response = await fetch(`/api/materials/${active.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const body = (await response.json().catch(() => null)) as { flashcards?: Card[]; quiz?: Question[]; error?: string; remaining?: number | null } | null;
    if (!response.ok || !body) {
      setMessage(body?.error ?? "Practice generation failed.");
      setLoading("");
      return;
    }
    setMaterials((items) => items.map((item) => item.id === active.id ? { ...item, ...(body.flashcards ? { flashcards: body.flashcards } : {}), ...(body.quiz ? { quiz: body.quiz } : {}) } : item));
    setTab(kind);
    setCardIndex(0);
    setRevealed(false);
    setAnswers({});
    setLoading("");
    if (typeof body.remaining === "number") setMessage(`${body.remaining} included AI action${body.remaining === 1 ? "" : "s"} remaining.`);
  }

  async function remove() {
    if (!active || !window.confirm(`Delete “${active.title}”, its files and generated practice?`)) return;
    setLoading("delete");
    const response = await fetch(`/api/materials/${active.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "The material could not be deleted.");
      setLoading("");
      return;
    }
    const next = materials.filter((item) => item.id !== active.id);
    setMaterials(next);
    setActiveId(next[0]?.id ?? "");
    setAdding(next.length === 0);
    setLoading("");
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-brand">My study materials</p>
          <h1 className="display mt-3 text-5xl tracking-[-.04em] md:text-6xl">Your notes, turned into practice.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Photograph handwritten pages, upload a question or screenshot, add a PDF, or paste notes. StudyWith reads the material once so you can reuse it for flashcards, quizzes and tutor sessions.</p>
        </div>
        <button type="button" onClick={() => { setAdding(true); setMessage(""); }} className="focus-ring flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#26343e]"><Plus size={16} /> Add material</button>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="card h-fit overflow-hidden bg-[#f8f8f5] p-2">
          <div className="flex items-center justify-between px-3 py-3">
            <div><p className="text-xs font-black">Saved library</p><p className="mt-1 text-[10px] text-muted">{materials.length} material{materials.length === 1 ? "" : "s"}</p></div>
            <button type="button" onClick={() => setAdding(true)} aria-label="Add material" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-ink shadow-sm hover:border-brand"><Plus size={15} /></button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 xl:grid xl:max-h-[620px] xl:overflow-y-auto">
            {materials.map((item) => (
              <button key={item.id} type="button" onClick={() => { setActiveId(item.id); setAdding(false); setTab("source"); setMessage(""); }} className={`min-w-60 rounded-2xl border p-4 text-left transition xl:min-w-0 ${activeId === item.id && !adding ? "border-ink bg-ink text-white shadow-sm" : "border-transparent bg-white hover:border-line"}`}>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${activeId === item.id && !adding ? "bg-white/12" : "bg-[#e5e9ff] text-brand"}`}><BookOpen size={16} /></span>
                <p className="mt-4 truncate text-sm font-extrabold">{item.title}</p>
                <p className={`mt-1.5 text-[10px] font-black uppercase tracking-[.12em] ${activeId === item.id && !adding ? "text-white/55" : "text-muted"}`}>{item.subject} · {item.attachments.length ? `${item.attachments.length} file${item.attachments.length === 1 ? "" : "s"}` : "pasted notes"}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="card min-h-[680px] overflow-hidden shadow-[0_18px_48px_rgba(16,24,32,.05)]">
          {adding ? (
            <form onSubmit={(event) => void saveMaterial(event)} className="mx-auto max-w-3xl p-6 md:p-10">
              <div className="flex items-start justify-between gap-4">
                <div><p className="eyebrow text-brand">New material</p><h2 className="display mt-3 text-4xl tracking-[-.035em]">Bring in the page you actually use.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Clear, straight-on photos work best. You can add up to five pages or files at once.</p></div>
                {materials.length ? <button type="button" onClick={() => { setAdding(false); clearDraft(); }} aria-label="Close" className="rounded-xl border border-line bg-white p-2 text-ink hover:bg-[#f2f3f3]"><X size={18} /></button> : null}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-extrabold">Material title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Respiration — class notes" className="focus-ring rounded-2xl border border-line bg-white px-4 py-3.5 font-medium outline-none focus:border-brand" /></label>
                <label className="grid gap-2 text-sm font-extrabold">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)} className="focus-ring rounded-2xl border border-line bg-white px-4 py-3.5 font-medium outline-none focus:border-brand">{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>

              <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
              <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
              <div
                className="mt-5 rounded-[24px] border-2 border-dashed border-[#c8cdd1] bg-[#f6f7f7] p-5 transition hover:border-brand"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
              >
                <div className="flex flex-col items-center justify-center py-5 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm"><UploadCloud size={21} /></span>
                  <p className="mt-4 text-sm font-extrabold">Drop photos, screenshots, PDFs or text files here</p>
                  <p className="mt-1 text-xs text-muted">JPG, PNG, WebP, PDF or TXT · 8 MB each</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => cameraInput.current?.click()} className="focus-ring flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#173ecc]"><Camera size={15} /> Take a photo</button>
                    <button type="button" onClick={() => fileInput.current?.click()} className="focus-ring flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-extrabold text-ink shadow-sm hover:border-ink"><Images size={15} /> Choose files</button>
                  </div>
                </div>
                {files.length ? (
                  <div className="grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
                    {files.map((file) => <LocalFile key={file.id} file={file} onRemove={() => removeLocalFile(file.id)} />)}
                  </div>
                ) : null}
              </div>

              <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.14em] text-muted"><span className="h-px flex-1 bg-line" />or paste text<span className="h-px flex-1 bg-line" /></div>
              <label className="grid gap-2 text-sm font-extrabold">Paste or type notes <span className="font-medium text-muted">(optional if you added a file)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={7} placeholder="Paste class notes, a model paragraph, definitions, or anything you want to practise from…" className="focus-ring rounded-2xl border border-line bg-white px-4 py-3.5 font-medium leading-6 outline-none focus:border-brand" /></label>
              {message ? <p role="alert" className="mt-4 rounded-xl bg-[#fff2e2] px-4 py-3 text-sm font-bold text-[#8a4b08]">{message}</p> : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button disabled={loading === "save" || (!files.length && notes.trim().length < 20)} className="focus-ring flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#173ecc] disabled:bg-[#cbd0d3] disabled:text-[#687177] disabled:shadow-none">
                  {loading === "save" ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{progress || (loading === "save" ? "Saving…" : "Read and save material")}
                </button>
                <p className="text-xs text-muted">Image reading uses one AI action. PDFs and pasted text do not.</p>
              </div>
            </form>
          ) : active ? (
            <div>
              <header className="border-b border-line bg-[#fffdf9] p-5 md:p-7">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-brand">{active.subject} · {active.source_type}</p><h2 className="mt-2 text-2xl font-black tracking-[-.03em]">{active.title}</h2><p className="mt-2 text-xs text-muted">Added {new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(active.created_at))}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void generate("cards")} disabled={Boolean(loading)} className="focus-ring flex items-center gap-2 rounded-full bg-[#e5e9ff] px-4 py-2.5 text-xs font-extrabold text-[#173ecc] hover:bg-[#d7defe] disabled:bg-[#edf0f1] disabled:text-[#8b9398]"><Sparkles size={14} />{loading === "cards" ? "Making cards…" : active.flashcards.length ? "Remake flashcards" : "Make flashcards"}</button>
                    <button type="button" onClick={() => void generate("quiz")} disabled={Boolean(loading)} className="focus-ring flex items-center gap-2 rounded-full bg-[#dff6ec] px-4 py-2.5 text-xs font-extrabold text-[#086348] hover:bg-[#cff0e0] disabled:bg-[#edf0f1] disabled:text-[#8b9398]"><Brain size={14} />{loading === "quiz" ? "Making quiz…" : active.quiz.length ? "Remake quiz" : "Make a quiz"}</button>
                    <Link href={`/app/tutor?material=${active.id}`} className="focus-ring flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-extrabold text-ink shadow-sm hover:border-ink"><ArrowUpRight size={14} /> Ask tutor</Link>
                    <button type="button" onClick={() => void remove()} disabled={Boolean(loading)} aria-label="Delete material" className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
                  </div>
                </div>
                {message ? <p role="status" className="mt-4 rounded-xl bg-[#f2f3f3] px-4 py-3 text-xs font-bold text-[#5d6670]">{message}</p> : null}
              </header>

              <div className="flex gap-1 overflow-x-auto border-b border-line px-5 pt-2 md:px-7">
                {(["source", "cards", "quiz"] as const).map((item) => (
                  <button key={item} type="button" onClick={() => { setTab(item); setRevealed(false); }} className={`border-b-2 px-4 py-3 text-xs font-extrabold capitalize ${tab === item ? "border-brand text-brand" : "border-transparent text-[#687177] hover:text-ink"}`}>
                    {item === "source" ? "Notes & files" : item === "cards" ? `Flashcards (${active.flashcards.length})` : `Quiz (${active.quiz.length})`}
                  </button>
                ))}
              </div>

              <div className="p-5 md:p-8">
                {tab === "source" ? <SourceView material={active} /> : tab === "cards" ? (
                  active.flashcards.length ? <FlashcardView cards={active.flashcards} index={cardIndex} setIndex={setCardIndex} revealed={revealed} setRevealed={setRevealed} /> : <EmptyState icon={Sparkles} title="No flashcards yet" text="Generate a focused active-recall deck from these notes when you are ready to test memory." action="Make flashcards" onAction={() => void generate("cards")} />
                ) : active.quiz.length ? (
                  <QuizView questions={active.quiz} answers={answers} setAnswers={setAnswers} />
                ) : <EmptyState icon={Brain} title="No quiz yet" text="Build six questions from this material and get an explanation immediately after each answer." action="Make a quiz" onAction={() => void generate("quiz")} />}
              </div>
            </div>
          ) : <EmptyState icon={BookOpen} title="Add your first study material" text="Use a photo, screenshot, PDF, text file or pasted notes." action="Add material" onAction={() => setAdding(true)} />}
        </section>
      </div>
    </div>
  );
}

function LocalFile({ file, onRemove }: { file: FileUIPart & { id: string }; onRemove: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white p-2.5">
      {file.mediaType?.startsWith("image/") && file.url ? <Image src={file.url} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#edf0f1] text-muted"><FileText size={17} /></span>}
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{file.filename}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-muted">{file.mediaType?.split("/")[1] || "file"}</p></div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.filename}`} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700"><X size={14} /></button>
    </div>
  );
}

function SourceView({ material }: { material: Material }) {
  return (
    <div className="grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <p className="text-xs font-black">Original files</p>
        <div className="mt-3 grid gap-2">
          {material.attachments.length ? material.attachments.map((file) => (
            <a key={file.id} href={`/api/attachments/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 hover:border-brand">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#edf0f1] text-brand">{file.mimeType.startsWith("image/") ? <FileImage size={16} /> : <FileText size={16} />}</span>
              <span className="min-w-0"><strong className="block truncate text-xs">{file.name}</strong><span className="mt-1 block text-[10px] text-muted">{Math.max(1, Math.round(file.size / 1024))} KB</span></span>
            </a>
          )) : <p className="rounded-xl border border-dashed border-line p-3 text-xs leading-5 text-muted">This material was pasted as text.</p>}
        </div>
      </aside>
      <article className="min-w-0 rounded-2xl border border-line bg-[#fffdf9] p-5 md:p-7">
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5e9ff] text-brand"><Sparkles size={16} /></span><div><h3 className="text-sm font-black">What StudyWith read</h3><p className="mt-0.5 text-[11px] text-muted">Check this before generating practice, especially if the source was handwritten.</p></div></div>
        <MessageResponse className="text-sm leading-7 text-[#3f4a52]">{material.extracted_text}</MessageResponse>
      </article>
    </div>
  );
}

function FlashcardView({ cards, index, setIndex, revealed, setRevealed }: { cards: Card[]; index: number; setIndex: (value: number) => void; revealed: boolean; setRevealed: (value: boolean) => void }) {
  const card = cards[Math.min(index, cards.length - 1)];
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between"><p className="text-xs font-black text-muted">CARD {index + 1} OF {cards.length}</p><p className="text-xs font-bold text-brand">{card.topic}</p></div>
      <button type="button" onClick={() => setRevealed(!revealed)} className={`focus-ring mt-4 grid min-h-80 w-full place-items-center rounded-[28px] border p-8 text-center transition ${revealed ? "border-brand bg-[#eef1ff]" : "border-line bg-[#fffdf2] hover:border-brand"}`}>
        <div><p className="text-[10px] font-black uppercase tracking-[.15em] text-brand">{revealed ? "Answer" : "Question"}</p><p className="mx-auto mt-6 max-w-xl text-xl font-black leading-8 md:text-2xl">{revealed ? card.answer : card.question}</p><p className="mt-8 text-xs text-muted">Click the card to {revealed ? "see the question" : "reveal the answer"}</p></div>
      </button>
      <div className="mt-5 flex items-center justify-between">
        <button type="button" disabled={index === 0} onClick={() => { setIndex(index - 1); setRevealed(false); }} className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-extrabold text-ink shadow-sm disabled:bg-[#edf0f1] disabled:text-[#9aa1a6] disabled:shadow-none"><ArrowLeft size={14} /> Previous</button>
        <button type="button" onClick={() => setRevealed(!revealed)} className="rounded-full bg-ink px-5 py-2.5 text-xs font-extrabold text-white">{revealed ? "Show question" : "Reveal answer"}</button>
        <button type="button" disabled={index === cards.length - 1} onClick={() => { setIndex(index + 1); setRevealed(false); }} className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-extrabold text-ink shadow-sm disabled:bg-[#edf0f1] disabled:text-[#9aa1a6] disabled:shadow-none">Next <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function QuizView({ questions, answers, setAnswers }: { questions: Question[]; answers: Record<string, number>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>> }) {
  const score = questions.filter((question) => answers[question.id] === question.correct_index).length;
  const complete = Object.keys(answers).length === questions.length;
  return (
    <div className="mx-auto max-w-3xl">
      {complete ? <div className="mb-6 flex items-center justify-between rounded-2xl bg-ink p-5 text-white"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/55">Quiz complete</p><p className="mt-2 text-2xl font-black">{score} / {questions.length} correct</p></div><button type="button" onClick={() => setAnswers({})} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-ink"><RotateCcw size={14} /> Try again</button></div> : null}
      <div className="grid gap-5">
        {questions.map((question, index) => {
          const selected = answers[question.id];
          return (
            <article key={question.id} className="rounded-2xl border border-line bg-white p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-brand">Question {index + 1}</p>
              <h3 className="mt-3 text-base font-black leading-6">{question.question}</h3>
              <div className="mt-5 grid gap-2">
                {question.options.map((option, optionIndex) => {
                  const answered = selected !== undefined;
                  const correct = optionIndex === question.correct_index;
                  const chosenWrong = answered && selected === optionIndex && !correct;
                  return <button type="button" disabled={answered} key={`${option}-${optionIndex}`} onClick={() => setAnswers((items) => ({ ...items, [question.id]: optionIndex }))} className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${answered && correct ? "border-[#55b892] bg-[#e9f8f1] text-[#075c42]" : chosenWrong ? "border-[#e28f8f] bg-[#fff0f0] text-[#8a1f1f]" : "border-line bg-[#fffdf9] hover:border-ink disabled:text-ink"}`}><span className="mr-3 font-black">{String.fromCharCode(65 + optionIndex)}.</span>{option}</button>;
                })}
              </div>
              {selected !== undefined ? <p className="mt-4 flex gap-3 rounded-xl bg-[#f2f3f3] p-4 text-sm leading-6 text-[#3f4a52]"><CheckCircle2 className="mt-1 shrink-0 text-brand" size={16} />{question.explanation}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }: { icon: typeof BookOpen; title: string; text: string; action: string; onAction: () => void }) {
  return <div className="grid min-h-[480px] place-items-center p-8 text-center"><div><span className="mx-auto grid h-13 w-13 place-items-center rounded-2xl bg-[#edf0f1] text-brand"><Icon size={20} /></span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{text}</p><button type="button" onClick={onAction} className="focus-ring mt-5 rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#173ecc]">{action}</button></div></div>;
}
