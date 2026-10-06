import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <PublicNav />
      <main className="py-20">
        <article className="shell max-w-3xl">
          <p className="eyebrow text-brand">Last updated 10 August 2026</p>
          <h1 className="display mt-5 text-6xl tracking-[-.04em]">Privacy, in plain language.</h1>
          <div className="mt-10 grid gap-9 leading-7 text-muted">
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">Who operates StudyWith</h2>
              <p>
                StudyWith is operated by Matthew O&apos;Leary as an independent freelancer in Ireland. Questions or
                requests can be sent to{" "}
                <a className="font-bold text-brand" href="mailto:hello@studywith.live">
                  hello@studywith.live
                </a>
                .
              </p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">What we collect</h2>
              <p>
                We store account details, study materials you choose to upload or paste, tutoring conversations,
                generated revision material, plan settings, purchases and the minimum technical records needed to secure
                and operate the service. We do not sell student data.
              </p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">How information is used</h2>
              <p>
                Information is used to provide and improve the requested study features, maintain account access,
                prevent misuse, process payments and respond to support requests. Study inputs are sent to the
                configured AI provider only when needed to return the feature you requested.
              </p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">Payments and service providers</h2>
              <p>
                Stripe processes payments. Supabase provides authentication and database infrastructure. Vercel hosts
                the application. The configured AI provider processes study prompts. Each provider handles information
                under its own contractual and security obligations.
              </p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">Your choices</h2>
              <p>
                You can ask for a copy, correction or deletion of your personal data. You can delete your account from
                Settings. Some transaction records may be retained where required for tax, accounting, fraud prevention
                or legal obligations.
              </p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">Students under 18</h2>
              <p>
                Privacy information is written for students as well as adults. If you are unsure whether you may use the
                service or make a purchase, speak with a parent or guardian. StudyWith will apply age-appropriate design
                and treat students&apos; best interests as a primary consideration.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
