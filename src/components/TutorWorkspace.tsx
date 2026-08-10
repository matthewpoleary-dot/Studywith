"use client";

import { ArrowUp, Brain, LoaderCircle, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = { role: "student" | "tutor"; content: string };
type Session = { id: string; title: string; subject: string; messages: Message[] };

const subjects = ["Maths", "English", "Irish", "Biology", "Chemistry", "Physics", "History", "Geography", "Business", "Economics", "Other"];

export function TutorWorkspace({ initialSessions }: { initialSessions: Session[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeId, setActiveId] = useState(initialSessions[0]?.id ?? "");
  const [subject, setSubject] = useState(initialSessions[0]?.subject ?? "Maths");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const active = sessions.find((session) => session.id === activeId);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages, loading]);

  async function send() {
    const text = input.trim(); if (!text || loading) return;
    setInput(""); setNotice(""); setLoading(true);
    const optimistic: Message[] = [...(active?.messages ?? []), { role: "student", content: text }];
    if (active) setSessions((items) => items.map((item) => item.id === active.id ? { ...item, messages: optimistic } : item));
    const response = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: active?.id, subject, messages: optimistic }) });
    const body = await response.json() as { session?: Session; error?: string; remaining?: number | null };
    if (!response.ok || !body.session) { setNotice(body.error ?? "The tutor could not respond. Try again."); if (active) setSessions((items) => items.map((item) => item.id === active.id ? { ...item, messages: active.messages } : item)); setLoading(false); return; }
    setSessions((items) => [body.session!, ...items.filter((item) => item.id !== body.session!.id)]); setActiveId(body.session.id); setLoading(false);
    if (typeof body.remaining === "number") setNotice(`${body.remaining} included AI action${body.remaining === 1 ? "" : "s"} remaining.`);
  }

  function newSession() { setActiveId(""); setInput(""); setNotice(""); }
  return <div className="grid min-h-[calc(100vh-80px)] overflow-hidden rounded-[28px] border border-line bg-paper-strong lg:grid-cols-[270px_1fr]"><aside className="border-b border-line bg-[#f7f6f1] p-4 lg:border-b-0 lg:border-r"><button onClick={newSession} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-extrabold text-white"><Plus size={16} /> New session</button><div className="mt-5 grid gap-1">{sessions.map((session) => <button key={session.id} onClick={() => { setActiveId(session.id); setSubject(session.subject); }} className={`rounded-xl px-3 py-3 text-left ${session.id === activeId ? "bg-white shadow-sm" : "hover:bg-white/60"}`}><p className="truncate text-sm font-bold">{session.title}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">{session.subject}</p></button>)}</div></aside><section className="flex min-h-[680px] flex-col"><header className="flex items-center justify-between border-b border-line px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white"><Brain size={19} /></span><div><h1 className="font-extrabold">Socratic tutor</h1><p className="text-xs text-muted">Hints, questions and feedback. Never assessed work.</p></div></div><select aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-full border border-line bg-white px-3 py-2 text-xs font-bold outline-none">{subjects.map((item) => <option key={item}>{item}</option>)}</select></header><div className="flex-1 overflow-y-auto p-5 md:p-8"><div className="mx-auto max-w-3xl space-y-5">{!active?.messages.length ? <div className="grid min-h-[430px] place-items-center text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#dfe6ff] text-brand"><Brain /></span><h2 className="display mt-5 text-4xl">What are you stuck on?</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Describe the exact concept, question or step. Include what you have already tried so the tutor can meet you at the right level.</p></div></div> : active.messages.map((message, index) => <div key={index} className={`flex ${message.role === "student" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "student" ? "rounded-tr-sm bg-brand text-white" : "rounded-tl-sm bg-[#edf0f1] text-ink"}`}>{message.content}</div></div>)}{loading ? <div className="flex items-center gap-2 text-xs font-bold text-muted"><LoaderCircle size={15} className="animate-spin" /> Thinking about the next useful question…</div> : null}<div ref={bottom} /></div></div><footer className="border-t border-line p-4"><div className="mx-auto max-w-3xl"><div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 focus-within:border-brand"><textarea aria-label="Message" rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Explain what you are working on and where it stopped making sense…" className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" /><button onClick={() => void send()} disabled={!input.trim() || loading} aria-label="Send" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-40"><ArrowUp size={18} /></button></div>{notice ? <p className="mt-2 text-xs font-bold text-muted">{notice}</p> : null}</div></footer></section></div>;
}
