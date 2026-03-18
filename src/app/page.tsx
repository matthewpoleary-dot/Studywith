"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
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
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Link,
  Star,
  XCircle,
  ArrowRight,
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
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white border border-[#E7E5E4] rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
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
          ? "bg-[#FDFCF8]/90 backdrop-blur-md border-b border-[#E7E5E4]/50"
          : "bg-transparent"
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

          <div className="hidden md:flex items-center gap-10">
            {["how-it-works", "features", "pricing", "faq"].map((id) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm font-medium capitalize"
              >
                {id.replace("-", " ")}
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
              {["how-it-works", "features", "pricing", "faq"].map((id) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm font-medium py-2 capitalize"
                >
                  {id.replace("-", " ")}
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

const Hero = () => {
  const scrollToSection = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="pt-40 pb-20 md:pt-52 md:pb-32 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-4xl">
          {/* Star rating social proof */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
              ))}
            </div>
            <span className="text-sm text-[#57534E] font-medium">
              Loved by students across A-Levels, Leaving Cert &amp; university
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.1] text-[#1A1A1A] mb-6">
            Learn to <em className="italic text-[#D97706]">think</em>, not just
            copy
          </h1>

          <p className="text-lg md:text-xl leading-relaxed text-[#57534E] max-w-2xl mb-10">
            Your AI tutor asks questions instead of giving answers. Paste any
            assignment and work through it until you genuinely understand it.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <CheckoutButton
              label="Get started"
              className="inline-flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-lg px-8 py-4 text-base font-medium transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            />
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="inline-flex items-center justify-center text-[#57534E] hover:text-[#1A1A1A] rounded-lg px-8 py-4 text-base font-medium transition-colors"
            >
              See how it works
              <ChevronRight className="w-4 h-4 ml-1.5 opacity-60" strokeWidth={1.5} />
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

      </div>
    </section>
  );
};

// ─── How It Works ─────────────────────────────────────────────────────────────

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: "Paste your assignment",
      description:
        "Share the problem you're working on: an essay prompt, maths question, or any exam topic.",
    },
    {
      number: "02",
      icon: Lightbulb,
      title: "Get guided questions",
      description:
        "Your AI tutor asks thoughtful questions to help you break down the problem and explore it from every angle.",
    },
    {
      number: "03",
      icon: Target,
      title: "Reach the answer yourself",
      description:
        "Through guided thinking, you arrive at the solution with genuine understanding, not just a copied answer.",
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

        {/* Chat preview */}
        <div className="mt-20 max-w-2xl mx-auto overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white">
          <div className="flex items-center gap-2.5 border-b border-[#E7E5E4] bg-[#F5F4F0] px-5 py-3">
            <div className="h-2 w-2 rounded-full bg-[#D97706]" />
            <span className="rounded-md bg-[#D97706]/10 px-2 py-0.5 text-[10px] font-semibold text-[#D97706] uppercase tracking-wide">Science</span>
            <p className="text-xs text-[#57534E]">
              Explain how photosynthesis converts light energy into glucose
            </p>
          </div>
          <div className="space-y-4 p-5 text-sm">
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">
                In one sentence: what do you think this assignment is asking
                you to do?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[#1A1A1A] px-4 py-3 leading-relaxed text-white">
                I think it wants me to explain how photosynthesis converts light
                into energy?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">
                Good start. What molecule does the plant produce to store that
                energy, and where does the carbon come from?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[#1A1A1A] px-4 py-3 leading-relaxed text-white">
                Glucose? And the carbon comes from CO2 in the air?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-[#F5F4F0] px-4 py-3 leading-relaxed text-[#1A1A1A]">
                Exactly right. Now where does the energy to drive that reaction come from, and what happens to the oxygen?
              </div>
            </div>
          </div>
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
        "Guided questioning that builds real understanding. The tutor never gives you the answer. It helps you find it.",
    },
    {
      icon: BookOpen,
      title: "Learning Receipts",
      description:
        "Every session ends with a scored breakdown: concepts you handled, gaps to review, and an honest score out of 100.",
    },
    {
      icon: TrendingUp,
      title: "Session History",
      description:
        "Every tutoring session is saved to your dashboard. See your progress across subjects over time.",
    },
    {
      icon: Link,
      title: "Shareable Receipts",
      description:
        "Each learning receipt has a unique link. Share it with a teacher or parent to show exactly what you worked through.",
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
              <p className="font-serif text-base font-medium text-[#1A1A1A]">Biology: Photosynthesis</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="font-serif text-3xl font-medium text-amber-600">72</span>
                <span className="text-sm text-[#A8A29E]">/100</span>
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5 mt-1 inline-block">Developing</span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Concepts covered */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E] mb-2">Concepts covered</p>
              <div className="space-y-1.5">
                {["Energy conversion in chloroplasts", "The role of chlorophyll", "Glucose as stored energy"].map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#D97706] shrink-0" strokeWidth={2.5} />
                    <span className="text-sm text-[#1A1A1A]">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps to review — highlighted as USP */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 mb-2">Gaps to review</p>
              <div className="space-y-2.5">
                {[
                  "Light-dependent vs light-independent reactions",
                  "The specific role of NADPH and ATP",
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
    { feature: "Gives you the answer directly", chatgpt: true, humanTutor: false, studywith: false },
    { feature: "Builds genuine understanding", chatgpt: false, humanTutor: true, studywith: true },
    { feature: "Available 24/7", chatgpt: true, humanTutor: false, studywith: true },
    { feature: "Scored learning breakdown", chatgpt: false, humanTutor: false, studywith: true },
    { feature: "Shareable session receipts", chatgpt: false, humanTutor: false, studywith: true },
    { feature: "Affordable flat price", chatgpt: false, humanTutor: false, studywith: true },
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
            ChatGPT answers for you. Human tutors cost £40/hr. StudyWith does something different.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white">
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
              <p className="text-xs text-[#A8A29E]">from €12.99/mo</p>
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
    </section>
  );
};

// ─── Use Cases ────────────────────────────────────────────────────────────────

const UseCases = () => {
  const useCases = [
    {
      icon: GraduationCap,
      title: "Exam Preparation",
      description:
        "Work through past papers and practice questions with guided support that helps you understand concepts, not just memorise answers.",
      example: "Perfect for A-Levels, Leaving Cert, GCSEs, and university",
    },
    {
      icon: PenLine,
      title: "Essay Writing",
      description:
        "Develop stronger arguments and structure your thoughts. Get questions that help you think critically about your thesis and evidence.",
      example: "Great for history, literature, and social sciences",
    },
    {
      icon: Calculator,
      title: "Maths Problems",
      description:
        "Step through complex problems one question at a time. Build confidence in your approach rather than jumping straight to formulas.",
      example: "From algebra to calculus and statistics",
    },
  ];

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 lg:px-24 bg-[#F5F4F0]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            Real use cases
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A]">
            How students use it
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

// ─── Pricing ──────────────────────────────────────────────────────────────────

const Pricing = () => {
  const features = [
    "Unlimited tutoring sessions",
    "Learning receipt after every session",
    "Full session history and dashboard",
    "Shareable receipt links",
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
            <p className="text-xs text-[#A8A29E] mb-6">Then €12.99/mo. Card required to start.</p>
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
            <p className="text-center text-xs text-[#A8A29E] mt-2">7 days free, then auto-renews.</p>
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
              Best value — save 43%
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
      question: "How is this different from just asking ChatGPT?",
      answer:
        "ChatGPT will just give you the answer. StudyWith is specifically designed to refuse that. It uses the Socratic method to guide your thinking. The goal is to make you better at reasoning through problems, not to complete your homework for you.",
    },
    {
      question: "What is the Socratic method?",
      answer:
        "The Socratic method is a teaching technique developed by the ancient Greek philosopher Socrates. Instead of lecturing or giving direct answers, a teacher asks a series of probing questions that lead the student to reason their way to understanding. The idea is that genuine understanding can't be handed to you. It has to be reached through your own thinking. Socrates believed that asking the right questions was more powerful than providing the right answers, because it builds reasoning skills that last. That's exactly the philosophy behind StudyWith.",
    },
    {
      question: "How does the Socratic tutoring method work?",
      answer:
        "Instead of giving you direct answers, our AI tutor asks thoughtful questions that guide you to discover the solution yourself. This approach builds deeper understanding and better retention. For example, if you're stuck on a maths problem, we might ask 'What do you know about the relationship between these variables?' rather than showing you the formula.",
    },
    {
      question: "Does the AI just give away answers directly?",
      answer:
        "No. That's exactly what we avoid. The AI will never simply hand over the answer. Instead, it guides you through the reasoning process with questions and hints. When you reach the answer, you'll genuinely understand how you got there.",
    },
    {
      question: "What subjects does StudyWith cover?",
      answer:
        "StudyWith covers a wide range of subjects including mathematics, sciences (physics, chemistry, biology), humanities (history, literature, philosophy), languages, programming, and more. Paste any assignment and the tutor adapts.",
    },
    {
      question: "What is a Learning Receipt?",
      answer:
        "At the end of each session, StudyWith generates a Learning Receipt, a scored breakdown of the session. It shows your score out of 100, the concepts you demonstrated understanding of, gaps to review, and a written summary. Each receipt has a unique shareable link.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer:
        "Absolutely. You can cancel your subscription at any time from your dashboard with no questions asked. You'll keep access until the end of your billing period.",
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
              An AI tutor that helps you think, not just copy. Learn through
              guided discovery.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-4">Product</h4>
            <ul className="space-y-3">
              {["how-it-works", "features", "pricing", "faq"].map((id) => (
                <li key={id}>
                  <button
                    onClick={() => scrollToSection(id)}
                    className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm capitalize"
                  >
                    {id.replace("-", " ")}
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
              {["Privacy Policy", "Terms of Service"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-[#57534E] hover:text-[#1A1A1A] transition-colors text-sm"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E7E5E4] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#57534E]">
            {currentYear} StudyWith. All rights reserved.
          </p>
          <p className="text-sm text-[#57534E]">
            Made for students who want to actually learn.
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
    const remember = localStorage.getItem("sw_remember");
    if (remember !== "1") return;
    if (new URLSearchParams(window.location.search).get("checkout") === "required") return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/app");
      } else {
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
    <div className="min-h-screen bg-[#FDFCF8]">
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Comparison />
        <UseCases />
        <Pricing />
        <FAQ />
        {/* Closing CTA */}
        <section className="py-20 md:py-32 px-6 md:px-12 lg:px-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] mb-4">
              Ready to actually understand your work?
            </h2>
            <p className="text-lg text-[#57534E] mb-10">
              Join students who learn by thinking, not copying.
            </p>
            <CheckoutButton
              label="Get started"
              className="inline-flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-lg px-10 py-4 text-base font-medium transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
