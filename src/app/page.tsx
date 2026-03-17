"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
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
          label="Subscribe for €20/month"
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

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
            <a
              href="/auth/login"
              className="rounded-full border border-[#E7E5E4] px-5 py-2.5 text-sm font-medium text-[#57534E] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all"
            >
              Sign in
            </a>
            <CheckoutButton
              label="Sign up"
              className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            />
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
              <a
                href="/auth/login"
                className="rounded-full border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#57534E] text-center"
              >
                Sign in
              </a>
              <CheckoutButton
                label="Sign up"
                className="bg-[#1A1A1A] text-white rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              />
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
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.1] text-[#1A1A1A] mb-6">
            Learn to <em className="italic text-[#D97706]">think</em>, not just
            copy
          </h1>

          <p className="text-lg md:text-xl leading-relaxed text-[#57534E] max-w-2xl mb-10">
            Stuck on an assignment? Your AI tutor won&apos;t give you the
            answer. It&apos;ll ask the right questions until you get there
            yourself.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <CheckoutButton
              label="Get started"
              className="inline-flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-full px-8 py-4 text-base font-medium transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            />
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="inline-flex items-center justify-center text-[#57534E] hover:text-[#1A1A1A] rounded-full px-8 py-4 text-base font-medium transition-colors"
            >
              How it works
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
          <div className="flex items-center gap-2 border-b border-[#E7E5E4] bg-[#F5F4F0] px-5 py-3">
            <div className="h-2 w-2 rounded-full bg-[#D97706]" />
            <p className="text-xs font-medium text-[#57534E]">
              Example session - Biology assignment
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
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-medium tracking-wide uppercase text-[#D97706] mb-4">
            Pricing
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
            One plan. Everything included. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="max-w-sm mx-auto">
          <div className="relative bg-white border border-[#D97706] p-8 md:p-10 rounded-2xl hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#D97706] rounded-t-2xl" />
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D97706] text-white text-xs font-medium px-4 py-1 rounded-full">
              Everything included
            </span>

            <h3 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-2 mt-2">
              Pro
            </h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="font-serif text-5xl font-medium text-[#1A1A1A]">
                €20
              </span>
              <span className="text-[#57534E]">/ month</span>
            </div>
            <p className="text-[#57534E] mb-8">
              Billed monthly. Cancel from your dashboard anytime.
            </p>

            <ul className="space-y-4 mb-8">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5"
                    strokeWidth={2}
                  />
                  <span className="text-[#1A1A1A]">{feature}</span>
                </li>
              ))}
            </ul>

            <CheckoutButton
              label="Get started"
              className="w-full rounded-full py-4 text-base font-medium bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            />
            <p className="text-center text-sm text-[#57534E] mt-3">
              No commitment. Cancel whenever.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = () => {
  const faqs = [
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
    {
      question: "How is this different from just asking ChatGPT?",
      answer:
        "ChatGPT will just give you the answer. StudyWith is specifically designed to refuse that. It uses the Socratic method to guide your thinking. The goal is to make you better at reasoning through problems, not to complete your homework for you.",
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

  // Auto-redirect authenticated users who chose "Keep me signed in".
  // If they unchecked that option, show the landing page so they sign in manually.
  useEffect(() => {
    const remember = localStorage.getItem("sw_remember");
    if (remember !== "1") return; // not opted in — stay on landing page
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/app");
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <UseCases />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
