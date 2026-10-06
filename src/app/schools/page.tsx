import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Presentation, QrCode, ShieldCheck } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "For schools",
  description:
    "A practical Leaving Cert talk on using AI to understand, practise and revise without producing assessed work.",
};

export default function SchoolsPage() {
  return (
    <>
      <section className="noise relative overflow-hidden bg-ink pb-24 pt-32 text-white md:pb-32 md:pt-40">
        <PublicNav inverse />
        <div className="soft-grid absolute inset-0 opacity-25" />
        <div className="shell relative">
          <p className="eyebrow text-[#9fb2ff]">StudyWith for Schools</p>
          <div className="mt-6 grid items-end gap-10 lg:grid-cols-[1.25fr_.75fr]">
            <h1 className="display text-5xl leading-[.95] tracking-[-.045em] md:text-8xl">
              Study smarter with AI.
              <br />
              <em className="text-[#bff4df]">Without letting it think for you.</em>
            </h1>
            <div>
              <p className="leading-7 text-white/65">
                A practical Leaving Cert session on explaining concepts, generating practice, structuring revision and
                overcoming learning gaps. Never on producing coursework or work submitted as a student&apos;s own.
              </p>
              <a
                href="mailto:hello@studywith.live?subject=StudyWith%20school%20talk"
                className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-ink"
              >
                Discuss a pilot <ArrowRight size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>
      <main>
        <section className="py-24">
          <div className="shell">
            <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]">
              <p className="eyebrow text-brand">The student outcome</p>
              <h2 className="display text-5xl leading-none tracking-[-.04em] md:text-7xl">
                A repeatable skill, not another motivational talk.
              </h2>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Presentation,
                  title: "60-minute live session",
                  text: "Clear demonstrations using LC examples, with academic-integrity boundaries stated from the start.",
                },
                {
                  icon: QrCode,
                  title: "Takeaway companion",
                  text: "Students leave with safe workflows they can use that evening, without needing an account during the talk.",
                },
                {
                  icon: ShieldCheck,
                  title: "School-safe framing",
                  text: "The session distinguishes revision support from coursework generation and reinforces teacher and SEC expectations.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article key={title} className="card p-7">
                  <Icon className="text-brand" />
                  <h3 className="mt-7 text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="border-y border-line bg-paper-strong py-24">
          <div className="shell grid gap-14 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-brand">Pilot format</p>
              <h2 className="display mt-5 text-5xl leading-none tracking-[-.04em]">
                Built first for 5th and 6th year.
              </h2>
              <p className="mt-6 leading-7 text-muted">
                The first one or two school sessions are offered as pilots in exchange for anonymous feedback, a school
                testimonial and permission to publish a short case study. After the format is proven, standard sessions
                begin from €250 depending on audience and scope.
              </p>
            </div>
            <ol className="grid gap-4">
              {[
                "How AI helps and where it crosses the line",
                "Live concept-explanation and active-recall demonstrations",
                "Build a study workflow from a real LC topic",
                "Takeaway toolkit and next actions",
              ].map((item, index) => (
                <li key={item} className="card flex items-center gap-5 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <strong>{item}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="bg-brand py-20 text-white">
          <div className="shell grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow text-white/60">For principals, year heads and guidance teams</p>
              <h2 className="display mt-4 text-5xl leading-none tracking-[-.04em]">
                Start with one Leaving Cert group.
              </h2>
              <div className="mt-6 flex flex-wrap gap-5 text-sm">
                {["No student signup during the talk", "Anonymous feedback", "Clear integrity policy"].map((x) => (
                  <span key={x} className="flex items-center gap-2">
                    <CheckCircle2 size={17} />
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href="mailto:hello@studywith.live?subject=StudyWith%20pilot"
              className="focus-ring rounded-full bg-white px-7 py-4 text-sm font-extrabold text-brand"
            >
              Arrange a pilot
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
