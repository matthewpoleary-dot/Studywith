"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Brain, CalendarDays, CreditCard, Home, LibraryBig, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const navigation = [
  { href: "/app", label: "Overview", icon: Home },
  { href: "/app/tutor", label: "AI tutor", icon: Brain },
  { href: "/app/materials", label: "My materials", icon: LibraryBig },
  { href: "/app/toolkit", label: "Study toolkit", icon: BookOpen },
  { href: "/app/planner", label: "Study plan", icon: CalendarDays },
  { href: "/app/settings", label: "Plan & settings", icon: CreditCard },
];

export function AppShell({ children, email, planLabel }: { children: React.ReactNode; email: string; planLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  async function signOut() { await createBrowserSupabase().auth.signOut(); window.location.href = "/"; }
  const sidebar = <><div className="flex h-20 items-center justify-between px-6"><Brand inverse /><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div><nav className="grid gap-1 px-3">{navigation.map(({ href, label, icon: Icon }) => { const active = href === "/app" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`focus-ring flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? "bg-white text-ink" : "text-white/60 hover:bg-white/8 hover:text-white"}`}><Icon size={18} />{label}</Link>; })}</nav><div className="mt-auto border-t border-white/10 p-5"><span className="rounded-full bg-[#bff4df] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-ink">{planLabel}</span><p className="mt-3 truncate text-xs text-white/50">{email}</p><button onClick={() => void signOut()} className="focus-ring mt-4 flex items-center gap-2 rounded-xl text-xs font-bold text-white/60 hover:text-white"><LogOut size={15} /> Sign out</button></div></>;
  return <div className="min-h-screen bg-[#edf0f1]"><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink lg:flex">{sidebar}</aside>{open ? <div className="fixed inset-0 z-50 bg-black/35 lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-72 flex-col bg-ink" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div> : null}<header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-paper-strong/90 px-4 backdrop-blur lg:hidden"><Brand /><button onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-xl border border-line p-2"><Menu /></button></header><main className="min-h-screen lg:pl-64"><div className="mx-auto max-w-[1240px] p-4 md:p-8 lg:p-10">{children}</div></main></div>;
}
