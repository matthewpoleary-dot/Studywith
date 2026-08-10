"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Brain, CalendarDays, CreditCard, Home, LibraryBig, LockKeyhole, LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const navigation = [
  { href: "/app", label: "Overview", icon: Home },
  { href: "/app/tutor", label: "AI tutor", icon: Brain },
  { href: "/app/materials", label: "Notes & practice", icon: LibraryBig },
  { href: "/app/planner", label: "Weekly plan", icon: CalendarDays },
  { href: "/app/toolkit", label: "Study toolkit", icon: BookOpen, toolkit: true },
  { href: "/app/settings", label: "Plan & settings", icon: CreditCard },
];

export function AppShell({ children, email, planLabel, hasToolkit }: { children: React.ReactNode; email: string; planLabel: string; hasToolkit: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initial = email.trim().charAt(0).toUpperCase() || "S";
  async function signOut() { await createBrowserSupabase().auth.signOut(); window.location.href = "/"; }

  const sidebar = (
    <>
      <div className="flex h-20 items-center justify-between px-6">
        <Brand inverse />
        <button type="button" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={19} /></button>
      </div>
      <div className="px-4 pb-5">
        <Link href="/app/tutor" onClick={() => setOpen(false)} className="focus-ring flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(36,87,255,.28)] transition hover:bg-[#3867ff]"><Sparkles size={16} /> Start studying</Link>
      </div>
      <nav className="grid gap-1 px-3" aria-label="StudyWith workspace">
        {navigation.map(({ href, label, icon: Icon, toolkit }) => {
          const active = href === "/app" ? pathname === href : pathname.startsWith(href);
          const locked = Boolean(toolkit && !hasToolkit);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`focus-ring group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? "bg-white text-ink shadow-sm" : "text-[#c7d0d7] hover:bg-white/10 hover:text-white"}`}>
              <Icon size={18} className={active ? "text-brand" : "text-[#9eabb5] group-hover:text-white"} />
              <span className="min-w-0 flex-1">{label}</span>
              {locked ? <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${active ? "bg-[#eef1ff] text-brand" : "bg-white/10 text-[#d8e0e6]"}`}><LockKeyhole size={10} /> Unlock</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4">
        {!hasToolkit ? (
          <Link href="/pricing" onClick={() => setOpen(false)} className="block rounded-2xl border border-white/10 bg-white/[.06] p-4 transition hover:bg-white/10">
            <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#9fb4ff]">AI Study Toolkit</p>
            <p className="mt-2 text-xs font-bold leading-5 text-white">Permanent study workflows and 25 AI actions.</p>
            <span className="mt-3 block text-xs font-extrabold text-white">See what&apos;s included →</span>
          </Link>
        ) : null}
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-ink">{initial}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{email}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#9fb4ff]">{planLabel}</p></div>
          <button type="button" onClick={() => void signOut()} aria-label="Sign out" className="rounded-xl p-2 text-[#9eabb5] hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#edf0f1]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-ink lg:flex">{sidebar}</aside>
      {open ? <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[290px] flex-col bg-ink shadow-2xl" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div> : null}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-[#fffdf9]/94 px-4 backdrop-blur lg:hidden"><Brand /><button type="button" onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-xl border border-line bg-white p-2 text-ink shadow-sm"><Menu size={20} /></button></header>
      <main className="min-h-screen lg:pl-[264px]"><div className="mx-auto max-w-[1440px] p-4 md:p-7 lg:p-9 xl:p-10">{children}</div></main>
    </div>
  );
}
