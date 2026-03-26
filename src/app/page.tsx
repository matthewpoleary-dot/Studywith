"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { posthog } from "@/lib/posthog";
import {
  MessageCircle,
  TrendingUp,
  BookOpen,
  ClipboardList,
  Lightbulb,
  Target,
  GraduationCap,
  PenLine,
  Calculator,
  Check,
  ChevronDown,
  Menu,
  X,
  CheckSquare,
  XCircle,
  ArrowRight,
  Send,
  FileUp,
  FlaskConical,
  Dna,
  FunctionSquare,
} from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";

// ─── Subscribe Banner (rendered inside the fixed nav) ─────────────────────────

const SubscribeBannerBar = () => {
  const searchParams = useSearchParams();
  if (searchParams.get("checkout") !== "required") return null;
  return (
    <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-300">
          <strong className="text-white">Account created.</strong>{" "}
          Subscribe to unlock your tutor.
        </p>
        <CheckoutButton
          label="Start your free trial"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </div>
  );
};

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

const FAQAccordion = ({
  items,
}: {
  items: { question: string; answer: string }[];
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const handleOpen = (index: number, question: string) => {
    const isOpening = openIndex !== index;
    setOpenIndex(isOpening ? index : null);
    if (isOpening) posthog.capture('faq_expanded', { question });
  };
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white border border-[#E7E5E4] rounded-xl overflow-hidden"
        >
          <button
            onClick={() => handleOpen(index, item.question)}
            className="w-full flex items-center justify-between p-5 text-left font-serif text-lg font-medium text-[#1A1A1A] hover:bg-[#F5F4F0]/50 transition-colors"
          >
            {item.question}
            <ChevronDown
              className={`w-5 h-5 text-[#57534E] transition-transform duration-200 shrink-0 ml-4 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === index ? "max-h-96" : "max-h-0"
            }`}
          >
            <p className="px-5 pb-5 text-[#57534E] leading-relaxed">
              {item.answer}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Navigation ───────────────────────────────────────────────────────────────

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    window.location.href = "/";
  };

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FDFCF8]/95 backdrop-blur-md shadow-sm border-b border-[#E7E5E4]/50"
          : "bg-[#FDFCF8] border-b border-[#E7E5E4]/30"
      }`}
    >
      {/* Subscribe banner lives inside the fixed nav so it never overlaps */}
      <Suspense fallback={null}>
        <SubscribeBannerBar />
      </Suspense>

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-20">
          <a
            href="/"
            className="font-serif text-2xl font-semibold text-[#1A1A1A] hover:opacity-80 transition-opacity"
          >
            StudyWith
          </a>

          <div className="hidden md:flex items-center gap-6">
            {[
              { id: "how-it-works", label: "How it works" },
              { id: "features", label: "Features" },
              { id: "pricing", label: "Pricing" },
              { id: "faq", label: "FAQ" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm font-medium whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <a
                  href="/app"
                  className="rounded-lg border border-[#E7E5E4] px-5 py-2.5 text-sm font-medium text-[#57534E] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all whitespace-nowrap"
                >
                  Dashboard
                </a>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1A1A1A]/90 transition-all"
                  >
                    <span className="max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E7E5E4] rounded-xl shadow-lg py-1 z-50">
                      <a
                        href="/app"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F5F4F0] transition-colors"
                      >
                        Dashboard
                      </a>
                      <a
                        href="/app/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F5F4F0] transition-colors"
                      >
                        Settings
                      </a>
                      <div className="my-1 border-t border-[#E7E5E4]" />
                      <button
                        onClick={() => void handleSignOut()}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a
                  href="/auth/login"
                  className="rounded-lg border border-[#E7E5E4] px-5 py-2.5 text-sm font-medium text-[#57534E] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all whitespace-nowrap"
                >
                  Sign in
                </a>
                <CheckoutButton
                  label="Sign up"
                  className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 whitespace-nowrap"
                />
              </>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#1A1A1A]" />
            ) : (
              <Menu className="w-6 h-6 text-[#1A1A1A]" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FDFCF8] border-t border-[#E7E5E4] py-4">
            <div className="flex flex-col gap-4">
              {[
                { id: "how-it-works", label: "How it works" },
                { id: "features", label: "Features" },
                { id: "pricing", label: "Pricing" },
                { id: "faq", label: "FAQ" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm font-medium py-2"
                >
                  {label}
                </button>
              ))}
              {user ? (
                <>
                  <a
                    href="/app"
                    className="rounded-lg border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#57534E] text-center"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/app/settings"
                    className="rounded-lg border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#57534E] text-center"
                  >
                    Settings
                  </a>
                  <button
                    onClick={() => void handleSignOut()}
                    className="rounded-lg bg-red-50 border border-red-200 px-6 py-3 text-sm font-medium text-red-600 text-center"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/auth/login"
                    className="rounded-lg border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#57534E] text-center"
                  >
                    Sign in
                  </a>
                  <CheckoutButton
                    label="Sign up"
                    className="bg-[#1A1A1A] text-white rounded-lg px-6 py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HERO_DEMOS = [
  {
    subject: "LC Chemistry",
    color: "#D97706",
    textColor: "text-[#D97706]",
    tag: "Higher Level · Q4(b)",
    question: "Le Chatelier's Principle: what happens when pressure increases in N₂ + 3H₂ ⇌ 2NH₃?",
    messages: [
      { role: "tutor", text: "Before any definition. When a system at equilibrium is disturbed, what do you think it tries to do?" },
      { role: "student", text: "Undo the change?" },
      { role: "tutor", text: "Exactly. So increasing pressure causes a shift toward fewer moles of gas. Count the moles on each side — which way does the equilibrium shift?" },
    ],
  },
  {
    subject: "LC Biology",
    color: "#16a34a",
    textColor: "text-green-700",
    tag: "Higher Level · Q6(a)",
    question: "Describe meiosis and explain its significance in sexual reproduction.",
    messages: [
      { role: "tutor", text: "Let's start at the output. What type of cells does meiosis produce, and how many chromosomes do they carry compared to body cells?" },
      { role: "student", text: "Haploid cells — half the chromosomes?" },
      { role: "tutor", text: "Good. Now think about fertilisation. What would happen to chromosome number each generation if gametes were diploid instead?" },
    ],
  },
  {
    subject: "LC Maths P1",
    color: "#7c3aed",
    textColor: "text-violet-700",
    tag: "Higher Level · Q7",
    question: "Differentiate f(x) = 3x² + 5x from first principles.",
    messages: [
      { role: "tutor", text: "Before any formula. What does the derivative of a function actually represent geometrically?" },
      { role: "student", text: "The slope of the tangent at any point on the curve?" },
      { role: "tutor", text: "Exactly. Now write f(x+h) for f(x) = 3x². Expand it out — what do you get when you form f(x+h) - f(x)?" },
    ],
  },
];

const Hero = () => {
  const [demoIndex, setDemoIndex] = useState(0);
  const [visibleMsgs, setVisibleMsgs] = useState(0);
  const scrollToSection = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // Reveal messages one by one, then cycle to next subject
  useEffect(() => {
    setVisibleMsgs(0);
    const delays = [800, 2000, 3400];
    const timers = delays.map((delay, i) =>
      setTimeout(() => setVisibleMsgs(i + 1), delay)
    );
    // After all messages shown, wait then cycle
    const cycleTimer = setTimeout(() => {
      setDemoIndex((idx) => (idx + 1) % HERO_DEMOS.length);
    }, 6500);
    return () => { timers.forEach(clearTimeout); clearTimeout(cycleTimer); };
  }, [demoIndex]);

  const demo = HERO_DEMOS[demoIndex];

  return (
    <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 md:px-12 lg:px-24 overflow-hidden">
      {/* Warm radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_-5%_0%,rgba(217,119,6,0.07),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_100%_80%,rgba(217,119,6,0.04),transparent_70%)]" />
      <div className="max-w-7xl mx-auto relative">
        <div className="flex flex-col lg:flex-row lg:items-center gap-16 lg:gap-24">
          {/* Left: copy */}
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-4xl xl:text-7xl font-medium tracking-tight leading-[1.1] text-[#1A1A1A] mb-6">
              Get the <em className="italic text-[#D97706]">H1</em>. Actually understand it.
            </h1>

            <p className="text-lg md:text-xl leading-relaxed text-[#57534E] max-w-xl mb-10">
              Paste any LC or JC question. Sage never gives you the answer — it asks you questions until you actually understand it. That's what builds the H1.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
              <div className="sm:flex-none sm:w-auto">
                <CheckoutButton
                  label="Start free, no card required"
                  className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/85 rounded-xl px-8 py-4 text-base font-medium transition-all hover:scale-[1.02] shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                />
              </div>
              <button
                onClick={() => { scrollToSection("try-it"); posthog.capture('see_how_it_works_clicked'); }}
                className="inline-flex items-center gap-2 border border-[#D6D3D1] text-[#57534E] rounded-xl px-5 py-3 text-sm font-medium hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all duration-200 whitespace-nowrap"
              >
                Try it without signing up
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-sm text-[#A8A29E]">
              Already a member?{" "}
              <a
                href="/auth/login"
                className="text-[#57534E] hover:text-[#1A1A1A] underline underline-offset-2 transition-colors"
              >
                Sign in
              </a>
            </p>
          </div>

          {/* Right: animated Socratic Q&A demo */}
          <div className="hidden lg:block flex-shrink-0 w-[420px]">
            <div className="relative">
              <div className="absolute inset-0 scale-110 rounded-3xl bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(217,119,6,0.08),transparent)]" />
              <div className="relative bg-white rounded-2xl border border-[#E7E5E4] shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12)] overflow-hidden">

                {/* Subject tab strip */}
                <div className="flex border-b border-[#E7E5E4] bg-[#F5F4F0]">
                  {HERO_DEMOS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setDemoIndex(i)}
                      className={`flex-1 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                        i === demoIndex
                          ? "bg-white border-b-2 border-[#D97706] text-[#D97706]"
                          : "text-[#A8A29E] hover:text-[#57534E]"
                      }`}
                    >
                      {d.subject}
                    </button>
                  ))}
                </div>

                {/* Question prompt */}
                <div className="px-4 py-3 bg-[#FDFAF5] border-b border-[#E7E5E4]">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">{demo.tag}</span>
                  <p className="text-[12px] text-[#57534E] mt-0.5 leading-snug">{demo.question}</p>
                </div>

                {/* Messages */}
                <div className="space-y-3 p-4 min-h-[220px]">
                  {demo.messages.slice(0, visibleMsgs).map((msg, i) => (
                    <div
                      key={`${demoIndex}-${i}`}
                      className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed text-[13px] ${
                          msg.role === "student"
                            ? "rounded-tr-sm bg-[#1A1A1A] text-white"
                            : "rounded-tl-sm bg-[#FAFAF8] border border-[#EDECEA] text-[#1A1A1A]"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {/* Typing indicator between messages */}
                  {visibleMsgs < demo.messages.length && visibleMsgs > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-[#FAFAF8] border border-[#EDECEA] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                        {[0,1,2].map((i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input bar mock */}
                <div className="border-t border-[#E7E5E4] px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-[#E7E5E4] bg-[#FAFAF8] px-3 py-2 text-xs text-[#A8A29E]">
                    Write your response…
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center shrink-0">
                    <Send className="w-3 h-3 text-white" strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── How It Works ─────────────────────────────────────────────────────────────

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: FileUp,
      title: "Upload your notes or paste a question",
      description:
        "Drop in your notes as a PDF, paste a LC exam question, or type any topic. The AI reads your material and builds your session from it.",
    },
    {
      number: "02",
      icon: Lightbulb,
      title: "Get Socratic questions, not answers",
      description:
        "Your AI tutor asks you questions. It never gives the answer directly. You work through the material until you genuinely understand it.",
    },
    {
      number: "03",
      icon: Target,
      title: "Get your Learning Receipt",
      description:
        "Every session ends with a scored breakdown: what you understood, what your gaps are, and an honest score out of 100. Share it or use it to plan your next session.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-32 px-6 md:px-12 lg:px-24 bg-[#F5F4F0]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            How it works
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A]">
            Learning through discovery
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-[#E7E5E4] mb-6">
                <step.icon
                  className="w-7 h-7 text-[#D97706]"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#57534E] mb-3">
                Step {step.number}
              </p>
              <h3 className="font-serif text-xl md:text-2xl font-medium text-[#1A1A1A] mb-4">
                {step.title}
              </h3>
              <p className="text-[#57534E] leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Chat preview — LC Biology */}
        <div className="mt-20 max-w-2xl mx-auto overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white">
          <div className="flex items-center gap-2.5 border-b border-[#E7E5E4] bg-[#F5F4F0] px-5 py-3">
            <div className="h-2 w-2 rounded-full bg-[#D97706]" />
            <span className="rounded-md bg-[#D97706]/10 px-2 py-0.5 text-[10px] font-semibold text-[#D97706] uppercase tracking-wide">LC Biology</span>
            <p className="text-xs text-[#57534E]">
              2023 LC Higher | Explain the process of meiosis and its significance in sexual reproduction
            </p>
          </div>
          <div className="space-y-4 p-5 text-sm">
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">
                Let&apos;s start with the basics. How many divisions happen in meiosis, and what type of cells does it produce?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[#1A1A1A] px-4 py-3 leading-relaxed text-white">
                Two divisions, and it produces 4 haploid cells?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">
                Good. Why is it essential that gametes are haploid? What would go wrong at fertilisation if they were diploid instead?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[#1A1A1A] px-4 py-3 leading-relaxed text-white">
                The chromosome number would double every generation… the zygote would be tetraploid?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">
                Exactly. Now explain what happens in Prophase I that doesn&apos;t occur in mitosis, and why that&apos;s significant for genetic variation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Try It Demo ──────────────────────────────────────────────────────────────

const DEMO_PROMPTS = [
  "Explain the difference between mitosis and meiosis for LC Biology",
  "What is Le Chatelier's Principle? LC Chemistry",
  "Explain Newton's First Law with an example | LC Physics",
  "What caused the 1916 Rising? LC History essay",
  "Differentiate f(x) = 3x² + 5x - 2 from first principles | LC Maths",
];

const DEMO_RESPONSES: Record<string, string> = {
  "Explain the difference between mitosis and meiosis for LC Biology":
    "Before I explain. What do you already know about what a cell is trying to achieve in each process? Think about the end result: how many cells, and what type?",
  "What is Le Chatelier's Principle? LC Chemistry":
    "Instead of me defining it. When you disturb a system at equilibrium (say, by increasing pressure), what do you think the system tries to do in response?",
  "Explain Newton's First Law with an example | LC Physics":
    "Good topic. Before the definition, can you describe what you observe when a ball rolls across a perfectly smooth surface with no friction? What happens to it, and why?",
  "What caused the 1916 Rising? LC History essay":
    "Let's build your argument from the ground up. If you had to identify the single most important long-term cause, which would you pick, and what's your justification for ranking it highest?",
  "Differentiate f(x) = 3x² + 5x - 2 from first principles | LC Maths":
    "Before we apply the limit definition. What does the derivative of a function actually represent geometrically? Describe it in your own words first.",
};

// Second Sage response — a natural follow-up regardless of what the user typed
const DEMO_FOLLOWUPS: Record<string, string> = {
  "Explain the difference between mitosis and meiosis for LC Biology":
    "Good. Now push further: what happens during Prophase I that doesn't occur in mitosis at all? Think about the genetic implications — this is a classic LC question.",
  "What is Le Chatelier's Principle? LC Chemistry":
    "You're getting it. Now apply it: in the Haber Process (N₂ + 3H₂ ⇌ 2NH₃), what conditions of temperature and pressure maximise yield, and what trade-off does the industry face?",
  "Explain Newton's First Law with an example | LC Physics":
    "Good example. Now link it to a car crash: why does a passenger lurch forward when the brakes are applied? Use Newton's First Law in your explanation.",
  "What caused the 1916 Rising? LC History essay":
    "Good start. Now structure your LC essay argument: rank your top two causes with justification. Which would you put first, and what evidence from the period supports that ranking?",
  "Differentiate f(x) = 3x² + 5x - 2 from first principles | LC Maths":
    "Good. Now work through it: expand f(x+h) = 3(x+h)² + 5(x+h) - 2, then subtract f(x), and simplify. What do you get before you take the limit as h→0?",
};

const TryItDemo = () => {
  const [input, setInput] = useState(DEMO_PROMPTS[0]);
  const [stage, setStage] = useState<"idle" | "thinking1" | "response1" | "thinking2" | "response2" | "gated">("idle");
  const [response1, setResponse1] = useState("");
  const [response2, setResponse2] = useState("");
  const [userReply1, setUserReply1] = useState("");
  const [userReply2, setUserReply2] = useState("");

  const handleTry = () => {
    setStage("thinking1");
    setTimeout(() => {
      const r = DEMO_RESPONSES[input] ?? "Before I answer, what do you already know about this topic? Try to explain it in your own words first.";
      setResponse1(r);
      setStage("response1");
    }, 1100);
  };

  const handleFirstReply = () => {
    if (!userReply1.trim()) return;
    setStage("thinking2");
    setTimeout(() => {
      const r = DEMO_FOLLOWUPS[input] ?? "Good thinking. Let's go deeper — what's the next logical step from what you just said?";
      setResponse2(r);
      setStage("response2");
    }, 900);
  };

  const handleSecondReply = () => {
    if (userReply2.trim()) setStage("gated");
  };

  const reset = () => {
    setStage("idle");
    setResponse1("");
    setResponse2("");
    setUserReply1("");
    setUserReply2("");
  };

  return (
    <section id="try-it" className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-[#F5F4F0]">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">Try it free</p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-[#1A1A1A] mb-3">
            See the difference. No sign-up needed.
          </h2>
          <p className="text-[#57534E]">Pick an LC topic below and see how Sage responds.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden shadow-sm">
          {/* Topic picker */}
          {stage === "idle" && (
            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">Choose a topic</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                      input === p
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "border-[#E7E5E4] text-[#57534E] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleTry}
                  className="w-full bg-[#1A1A1A] text-white rounded-xl py-3.5 text-sm font-medium hover:bg-[#1A1A1A]/90 transition-all hover:scale-[1.01]"
                >
                  Ask Sage →
                </button>
              </div>
            </div>
          )}

          {/* Thinking indicators */}
          {(stage === "thinking1" || stage === "thinking2") && (
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm text-[#A8A29E]">Sage is thinking…</p>
            </div>
          )}

          {/* Conversation thread */}
          {(stage === "response1" || stage === "thinking2" || stage === "response2" || stage === "gated") && (
            <div className="flex flex-col">
              <div className="px-5 py-3 bg-[#F5F4F0] border-b border-[#E7E5E4] flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
                <span className="text-xs text-[#57534E] font-medium truncate">{input}</span>
              </div>

              <div className="space-y-3 p-5 text-sm">
                {/* Sage turn 1 */}
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">{response1}</div>
                </div>
                {/* Student turn 1 */}
                {userReply1 && (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-[#1A1A1A] px-4 py-3 leading-relaxed text-white text-sm">{userReply1}</div>
                  </div>
                )}
                {/* Sage turn 2 */}
                {response2 && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">{response2}</div>
                  </div>
                )}
                {/* Student turn 2 */}
                {userReply2 && stage === "gated" && (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-[#1A1A1A] px-4 py-3 leading-relaxed text-white text-sm">{userReply2}</div>
                  </div>
                )}
              </div>

              {/* Input after turn 1 */}
              {stage === "response1" && (
                <div className="border-t border-[#E7E5E4] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userReply1}
                      onChange={(e) => setUserReply1(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleFirstReply(); }}
                      placeholder="Your answer…"
                      autoFocus
                      className="flex-1 rounded-xl border border-[#E7E5E4] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#A8A29E] outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                    />
                    <button onClick={handleFirstReply} disabled={!userReply1.trim()} className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0 disabled:opacity-40 transition hover:bg-[#1A1A1A]/80">
                      <Send className="w-4 h-4 text-white" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Input after turn 2 */}
              {stage === "response2" && (
                <div className="border-t border-[#E7E5E4] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userReply2}
                      onChange={(e) => setUserReply2(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSecondReply(); }}
                      placeholder="Keep going…"
                      autoFocus
                      className="flex-1 rounded-xl border border-[#E7E5E4] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#A8A29E] outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                    />
                    <button onClick={handleSecondReply} disabled={!userReply2.trim()} className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0 disabled:opacity-40 transition hover:bg-[#1A1A1A]/80">
                      <Send className="w-4 h-4 text-white" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Signup gate */}
              {stage === "gated" && (
                <div className="border-t border-[#E7E5E4] p-5 bg-[#FDFAF5]">
                  <div className="text-center space-y-3">
                    <p className="text-sm font-medium text-[#1A1A1A]">Ready to keep going?</p>
                    <p className="text-xs text-[#57534E]">Sign up free to continue — unlimited sessions, all LC subjects.</p>
                    <a
                      href="/auth/signup"
                      onClick={() => posthog.capture('cta_clicked', { cta_location: 'try_it_gate' })}
                      className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-[#1A1A1A]/90 transition-all hover:scale-[1.02] w-full"
                    >
                      Start free, no card required
                    </a>
                    <button onClick={reset} className="text-xs text-[#A8A29E] hover:text-[#57534E] underline underline-offset-2">
                      Try a different topic
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Features ─────────────────────────────────────────────────────────────────

const Features = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "Socratic Method",
      description:
        "Sage never gives the answer. It asks you questions until you get there yourself. Built for LC and JC exam technique: you learn to reason, not just recall.",
    },
    {
      icon: BookOpen,
      title: "Learning Receipts",
      description:
        "Every session ends with a scored breakdown out of 100: what you understood, your gaps, and what to review before your mocks or the real LC.",
    },
    {
      icon: TrendingUp,
      title: "Session History",
      description:
        "Every tutoring session is saved to your dashboard. Track your progress subject by subject and see what you've covered and what still needs work.",
    },
    {
      icon: CheckSquare,
      title: "Answer Checker",
      description:
        "Already written your answer? Switch to marking mode. Sage marks it like an LC examiner, telling you exactly what you got right, what's missing, and what the marking scheme would award.",
    },
  ];

  return (
    <section
      id="features"
      className="py-20 md:py-32 px-6 md:px-12 lg:px-24"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            Features
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] max-w-3xl mx-auto">
            Everything you need to learn deeply
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white border border-[#E7E5E4] p-8 md:p-10 rounded-xl hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F5F4F0] flex items-center justify-center group-hover:bg-[#D97706]/10 transition-colors">
                  <feature.icon
                    className="w-6 h-6 text-[#D97706]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3 className="font-serif text-xl md:text-2xl font-medium text-[#1A1A1A] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#57534E] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Learning Receipt preview */}
        <div className="mt-16 max-w-lg mx-auto bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden shadow-sm">
          {/* Receipt header */}
          <div className="bg-[#F5F4F0] border-b border-[#E7E5E4] px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E] mb-0.5">Learning Receipt</p>
              <p className="font-serif text-base font-medium text-[#1A1A1A]">LC Chemistry: Organic Chemistry</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="font-serif text-3xl font-medium text-amber-600">84</span>
                <span className="text-sm text-[#A8A29E]">/100</span>
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-0.5 mt-1 inline-block">H2 Level</span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Concepts covered */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E] mb-2">Concepts covered</p>
              <div className="space-y-1.5">
                {["Functional groups of alcohols, esters & aldehydes", "Condensation reactions & esterification", "Naming organic compounds (IUPAC)"].map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#D97706] shrink-0" strokeWidth={2.5} />
                    <span className="text-sm text-[#1A1A1A]">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps to review — highlighted as USP */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 mb-2">Gaps to review before mocks</p>
              <div className="space-y-2.5">
                {[
                  "Mechanism of addition reactions in alkenes",
                  "Distinguishing tests for organic compounds",
                ].map((g) => (
                  <div key={g} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="text-[#A8A29E] mt-0.5 shrink-0 text-xs">→</span>
                      <span className="text-sm text-[#57534E]">{g}</span>
                    </div>
                    <span className="text-[11px] font-medium text-[#D97706] shrink-0 flex items-center gap-0.5 hover:underline cursor-pointer whitespace-nowrap">
                      Review this <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#A8A29E] italic">
              Click &ldquo;Review this&rdquo; on any gap to start a new session focused on that topic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};



// ─── Comparison ───────────────────────────────────────────────────────────────

const Comparison = () => {
  const rows = [
    { feature: "Gives you the answer (useless for exams)", chatgpt: true, humanTutor: false, studywith: false },
    { feature: "Builds genuine H1-level understanding", chatgpt: false, humanTutor: true, studywith: true },
    { feature: "Available at 2am before your mocks", chatgpt: true, humanTutor: false, studywith: true },
    { feature: "Works from your own uploaded notes", chatgpt: false, humanTutor: false, studywith: true },
    { feature: "Scored breakdown after every session", chatgpt: false, humanTutor: false, studywith: true },
    { feature: "Marks your answers like an LC examiner", chatgpt: false, humanTutor: true, studywith: true },
  ];

  const Cell = ({ value, highlight }: { value: boolean; highlight?: boolean }) =>
    value ? (
      <Check className={`w-5 h-5 mx-auto ${highlight ? "text-[#D97706]" : "text-[#57534E]"}`} strokeWidth={2.5} />
    ) : (
      <XCircle className="w-5 h-5 mx-auto text-[#E7E5E4]" strokeWidth={2} />
    );

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            Why StudyWith
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] mb-4">
            Not all AI tutors are equal
          </h2>
          <p className="text-lg text-[#57534E]">
            ChatGPT writes your answers. Human grinds cost €40/hr. StudyWith makes you actually understand it.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E7E5E4]">
          <div className="min-w-[480px] bg-white">
          {/* Header */}
          <div className="grid grid-cols-4 border-b border-[#E7E5E4]">
            <div className="p-5 col-span-1" />
            <div className="p-5 text-center border-l border-[#E7E5E4]">
              <p className="text-sm font-medium text-[#57534E]">ChatGPT</p>
            </div>
            <div className="p-5 text-center border-l border-[#E7E5E4]">
              <p className="text-sm font-medium text-[#57534E]">Human tutor</p>
              <p className="text-xs text-[#A8A29E]">~€40/hr</p>
            </div>
            <div className="p-5 text-center border-l border-[#E7E5E4] bg-[#FDFAF5]">
              <p className="text-sm font-semibold text-[#D97706]">StudyWith</p>
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 mt-0.5">Free trial</span>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 border-b border-[#E7E5E4] last:border-0 ${
                i % 2 === 1 ? "bg-[#F5F4F0]/30" : ""
              }`}
            >
              <div className="p-5 col-span-1">
                <p className="text-sm text-[#1A1A1A]">{row.feature}</p>
              </div>
              <div className="p-5 border-l border-[#E7E5E4] flex items-center justify-center">
                <Cell value={row.chatgpt} />
              </div>
              <div className="p-5 border-l border-[#E7E5E4] flex items-center justify-center">
                <Cell value={row.humanTutor} />
              </div>
              <div className="p-5 border-l border-[#E7E5E4] flex items-center justify-center bg-[#FDFAF5]">
                <Cell value={row.studywith} highlight />
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Use Cases ────────────────────────────────────────────────────────────────

const UseCases = () => {
  const useCases = [
    {
      icon: FlaskConical,
      title: "LC Science Subjects",
      description:
        "Work through Chemistry, Biology, and Physics past papers question by question. Sage guides you to the right reasoning, never just handing you the answer.",
      example: "Chemistry, Biology, Physics, Agricultural Science",
    },
    {
      icon: FunctionSquare,
      title: "LC & JC Maths",
      description:
        "Step through Paper 1 and Paper 2 problems one line at a time. Build the method, not just the answer, because the LC marking scheme rewards method marks.",
      example: "Higher & Ordinary Level · Paper 1 & Paper 2",
    },
    {
      icon: Dna,
      title: "Essay & Language Subjects",
      description:
        "Structure your LC English essay, develop a History argument, or practise Irish expression. Sage helps you find your own thesis, not write it for you.",
      example: "English, Irish, History, Geography, Business, Economics",
    },
  ];

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 lg:px-24 bg-[#F5F4F0]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            LC &amp; JC subjects
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A]">
            Every subject. Every paper.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="bg-white border border-[#E7E5E4] p-8 rounded-xl hover:-translate-y-1 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-[#D97706]/10 flex items-center justify-center mb-6">
                <useCase.icon
                  className="w-7 h-7 text-[#D97706]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-serif text-xl md:text-2xl font-medium text-[#1A1A1A] mb-4">
                {useCase.title}
              </h3>
              <p className="text-[#57534E] leading-relaxed mb-4">
                {useCase.description}
              </p>
              <p className="text-sm text-[#D97706] font-medium">
                {useCase.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Pricing (removed — free early access) ───────────────────────────────────

const Pricing = () => {
  const features = [
    "Unlimited tutoring sessions",
    "Learning receipt after every session",
    "Full session history and dashboard",
    "Answer checker and marking mode",
    "Any subject or assignment type",
    "Cancel anytime, no contracts",
  ];

  return (
    <section
      id="pricing"
      className="py-20 md:py-32 px-6 md:px-12 lg:px-24"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            Pricing
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
            Pick the plan that suits you. Student pricing applied automatically at checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Trial */}
          <div className="relative bg-white border border-[#E7E5E4] p-8 rounded-2xl hover:shadow-lg transition-all duration-300 flex flex-col">
            <h3 className="font-serif text-xl font-medium text-[#1A1A1A] mb-1">Free trial</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-medium text-[#1A1A1A]">€0</span>
              <span className="text-[#57534E] text-sm">today</span>
            </div>
            <p className="text-xs text-[#A8A29E] mb-6">Then €12.99/mo. No card required to start.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-sm text-[#1A1A1A]">{feature}</span>
                </li>
              ))}
            </ul>
            <CheckoutButton
              plan="trial"
              label="Start 7-day free trial"
              className="w-full rounded-lg py-3 text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-center text-xs text-[#A8A29E] mt-2">7 days free. Add a card to continue after the trial.</p>
          </div>

          {/* Monthly */}
          <div className="relative bg-white border border-[#E7E5E4] p-8 rounded-2xl hover:shadow-lg transition-all duration-300 flex flex-col">
            <h3 className="font-serif text-xl font-medium text-[#1A1A1A] mb-1">Monthly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-medium text-[#1A1A1A]">€12.99</span>
              <span className="text-[#57534E] text-sm">/ month</span>
            </div>
            <p className="text-xs text-[#A8A29E] mb-6">Billed monthly. Cancel anytime.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-sm text-[#1A1A1A]">{feature}</span>
                </li>
              ))}
            </ul>
            <CheckoutButton
              plan="monthly"
              label="Get monthly"
              className="w-full rounded-lg py-3 text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-center text-xs text-[#A8A29E] mt-2">No trial. Access starts immediately.</p>
          </div>

          {/* Annual — highlighted */}
          <div className="relative bg-[#1A1A1A] border border-[#1A1A1A] p-8 rounded-2xl hover:shadow-xl transition-all duration-300 flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D97706] text-white text-xs font-medium px-4 py-1 rounded-full whitespace-nowrap">
              Best value, save 43%
            </span>
            <h3 className="font-serif text-xl font-medium text-white mb-1 mt-2">Annual</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-medium text-white">€7.42</span>
              <span className="text-zinc-400 text-sm">/ month</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Billed as €89/year. Cancel anytime.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-sm text-white">{feature}</span>
                </li>
              ))}
            </ul>
            <CheckoutButton
              plan="annual"
              label="Get annual"
              className="w-full rounded-lg py-3 text-sm font-medium bg-white text-[#1A1A1A] hover:bg-zinc-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-center text-xs text-zinc-500 mt-2">No trial. Access starts immediately.</p>
          </div>
        </div>

        <p className="text-center text-xs text-[#A8A29E] mt-8">
          Have a .edu or academic email? Student pricing (€5.99/mo or €39/yr) is applied automatically.
        </p>
      </div>
    </section>
  );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = () => {
  const faqs = [
    {
      question: "Is this built specifically for the Leaving Cert and Junior Cycle?",
      answer:
        "Yes. StudyWith is designed around the Irish curriculum: LC and JC subjects, SEC exam formats, marking scheme logic, and H1/H2 exam technique. The AI knows the difference between LC Higher and Ordinary Level, understands what SRPs are in essay marking, and is familiar with all the major LC subjects from Chemistry to Irish to History.",
    },
    {
      question: "Why not just use ChatGPT for my LC studying?",
      answer:
        "ChatGPT will write your answer for you, which is exactly what you don't want when preparing for the LC. When the exam comes, there's no AI in the room. StudyWith refuses to give you the answer directly. Instead, it asks you questions until you get there yourself. That's what builds the understanding you need on exam day. Plus, ChatGPT has no idea what's in your notes. StudyWith reads your uploaded PDFs and works from your actual material.",
    },
    {
      question: "Can I upload my own notes?",
      answer:
        "Yes. You can upload your notes as a PDF and StudyWith will work through them with you using Socratic questioning. The AI reads your specific material and builds questions from it, so you're always studying what's actually relevant to your exams, not generic content.",
    },
    {
      question: "Does the AI just give away answers directly?",
      answer:
        "No, and that's the whole point. The AI is specifically instructed never to hand over an answer, even if you ask it directly. It will give hints, ask guiding questions, and help you get unstuck, but you have to reach the answer yourself. This is what builds the exam-ready understanding you need.",
    },
    {
      question: "What LC subjects does StudyWith cover?",
      answer:
        "All of them. Chemistry, Biology, Physics, Maths (Paper 1 and Paper 2), English, Irish, History, Geography, Business, Economics, Accounting, Agricultural Science, Computer Science, Languages (French, German, Spanish), Art, Music, Home Economics, PE, and more. Paste any question or topic and the tutor adapts to the subject.",
    },
    {
      question: "What is a Learning Receipt?",
      answer:
        "At the end of every session, StudyWith generates a Learning Receipt: a scored breakdown out of 100. It shows the concepts you demonstrated understanding of, the gaps you still need to review before your mocks or the real LC, and an honest overall score. Each receipt has a unique shareable link so you can keep a record of your progress.",
    },
    {
      question: "How much does it cost?",
      answer:
        "There's a 7-day free trial with no charge upfront, no card required to start. After the trial, plans start at €7.42/month on annual billing. Student pricing (€5.99/mo or €39/yr) is applied automatically at checkout if you have a .ac.ie or .edu email. You can cancel anytime.",
    },
    {
      question: "Is my data private? Where do my PDFs go?",
      answer:
        "Your uploaded PDFs and session conversations are private to your account and are never used to train the AI or shared with anyone. Sessions are stored so you can review them, and you can delete your data at any time from your account settings.",
    },
  ];

  return (
    <section
      id="faq"
      className="py-20 md:py-32 px-6 md:px-12 lg:px-24 bg-[#F5F4F0]"
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            FAQ
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A]">
            Frequently asked questions
          </h2>
        </div>
        <FAQAccordion items={faqs} />
      </div>
    </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const scrollToSection = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="py-16 md:py-20 px-6 md:px-12 lg:px-24 border-t border-[#E7E5E4]">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 md:gap-8 mb-12">
          <div className="md:col-span-1">
            <a
              href="/"
              className="font-serif text-2xl font-semibold text-[#1A1A1A] hover:opacity-80 transition-opacity"
            >
              StudyWith
            </a>
            <p className="text-[#57534E] mt-4 text-sm leading-relaxed">
              The AI study companion built for Leaving Cert and Junior Cycle students. Upload your notes. Understand your material. Get the H1.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-4">Product</h4>
            <ul className="space-y-3">
              {[
                { id: "how-it-works", label: "How it works" },
                { id: "features", label: "Features" },
                { id: "faq", label: "FAQ" },
              ].map(({ id, label }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollToSection(id)}
                    className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-4">Account</h4>
            <ul className="space-y-3">
              {[
                { label: "Sign in", href: "/auth/login" },
                { label: "Create account", href: "/auth/signup" },
                { label: "Dashboard", href: "/app" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-4">Legal</h4>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E7E5E4] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#57534E]">
            &copy; {currentYear} StudyWith. All rights reserved.
          </p>
          <p className="text-sm text-[#57534E]">
            Made for LC &amp; JC students who want to actually understand it.
          </p>
        </div>
      </div>
    </footer>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudyWithLanding() {
  const router = useRouter();

  useEffect(() => {
    posthog.capture('landing_page_viewed')
  }, [])

  useEffect(() => {
    const remember = localStorage.getItem("sw_remember");
    if (remember !== "1") return;
    if (new URLSearchParams(window.location.search).get("checkout") === "required") return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        localStorage.removeItem("sw_remember");
      }
    });
  }, [router]);

  // Capture referral code from /?ref=... so CheckoutButton can send it
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      localStorage.setItem("studywith_referral", ref);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCF8] overflow-x-hidden">
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <TryItDemo />
        <Features />
        <Comparison />
        <UseCases />
        <Pricing />
        <FAQ />
        {/* Closing CTA */}
        <section className="py-20 md:py-32 px-6 md:px-12 lg:px-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] mb-4">
              Your mocks are closer than you think.
            </h2>
            <p className="text-lg text-[#57534E] mb-10">
              Start studying smarter today. Upload your notes and let Sage guide you to the H1.
            </p>
            <a
              href="/auth/signup"
              onClick={() => posthog.capture('cta_clicked', { cta_location: 'footer' })}
              className="inline-flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-xl px-10 py-4 text-base font-medium transition-all hover:scale-[1.02]"
            >
              Start free, no card required
            </a>
            <p className="text-sm text-[#A8A29E] mt-4">7-day free trial · Cancel anytime</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
