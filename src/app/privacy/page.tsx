import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — StudyWith",
  description: "How StudyWith collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-[#57534E] hover:text-[#1A1A1A] transition-colors mb-10 inline-block">
          ← Back to home
        </Link>

        <h1 className="font-serif text-4xl font-medium text-[#1A1A1A] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#A8A29E] mb-12">Last updated: March 2026</p>

        <div className="prose prose-stone max-w-none space-y-10 text-[#1A1A1A]">

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">1. Who we are</h2>
            <p className="text-[#57534E] leading-relaxed">
              StudyWith (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an AI-powered tutoring service. We help students learn through guided Socratic questioning rather than providing direct answers. Our service is operated from Ireland and is subject to European data protection law (GDPR).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">2. What data we collect</h2>
            <p className="text-[#57534E] leading-relaxed mb-3">We collect the following categories of personal data:</p>
            <ul className="space-y-2 text-[#57534E]">
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Account data:</strong> Your email address and password (hashed), used to create and secure your account.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Session content:</strong> The assignments, questions, and messages you submit during tutoring sessions, stored so you can review them later.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Usage data:</strong> Session timestamps, scores, and learning receipts generated at the end of each session.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Preferences:</strong> Settings such as your chosen tutor avatar and daily goal, stored in your account profile.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Billing data:</strong> If you subscribe, payment is handled by Stripe. We never store card numbers. We receive a customer ID and subscription status from Stripe.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">3. How we use your data</h2>
            <ul className="space-y-2 text-[#57534E]">
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>To provide the tutoring service and save your session history.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>To generate learning receipts and track your progress over time.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>To manage your account and subscription.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>To send transactional emails (e.g. password resets, email verification).</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>To improve the service based on aggregated, anonymised usage patterns.</span></li>
            </ul>
            <p className="text-[#57534E] leading-relaxed mt-3">We do not sell your data. We do not use your session content to train AI models.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">4. Third-party services</h2>
            <p className="text-[#57534E] leading-relaxed mb-3">We use the following third-party providers to operate the service:</p>
            <ul className="space-y-2 text-[#57534E]">
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Supabase</strong> — database and authentication. Your account data and session history are stored on Supabase infrastructure.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Groq</strong> — AI inference. Your session messages are sent to Groq&apos;s API to generate tutor responses. Groq&apos;s data processing terms apply.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span><strong className="text-[#1A1A1A]">Stripe</strong> — payment processing. Billing is handled entirely by Stripe. We do not see or store your full card details.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">5. Data retention</h2>
            <p className="text-[#57534E] leading-relaxed">
              Your account data and session history are retained for as long as your account is active. If you delete your account, all associated data is permanently deleted within 30 days. You can request deletion at any time by contacting us or using the delete account option in Settings.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">6. Your rights</h2>
            <p className="text-[#57534E] leading-relaxed mb-3">Under GDPR, you have the right to:</p>
            <ul className="space-y-2 text-[#57534E]">
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>Access the personal data we hold about you.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>Correct inaccurate data.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>Request deletion of your data.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>Object to or restrict processing.</span></li>
              <li className="flex gap-2"><span className="text-[#D97706] shrink-0">•</span><span>Data portability — receive a copy of your data in a machine-readable format.</span></li>
            </ul>
            <p className="text-[#57534E] leading-relaxed mt-3">To exercise any of these rights, contact us at the address below.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">7. Cookies</h2>
            <p className="text-[#57534E] leading-relaxed">
              We use essential session cookies to keep you logged in. We do not use tracking cookies or advertising cookies. No third-party analytics scripts are loaded on this site.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">8. Children</h2>
            <p className="text-[#57534E] leading-relaxed">
              StudyWith is intended for users aged 13 and over. If you are under 16, you should have parental or guardian consent to use this service. We do not knowingly collect data from children under 13. If you believe a child under 13 has created an account, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">9. Changes to this policy</h2>
            <p className="text-[#57534E] leading-relaxed">
              We may update this policy from time to time. If we make significant changes, we will notify you by email or by displaying a notice in the app. Continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">10. Contact</h2>
            <p className="text-[#57534E] leading-relaxed">
              For any privacy-related questions or requests, contact us at{" "}
              <a href="mailto:hello@studywith.app" className="text-[#D97706] hover:underline">hello@studywith.app</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
