# StudyWith

StudyWith is a focused AI study workspace for Irish Leaving Certificate students. It supports Socratic tutoring, note-based flashcards and quizzes, evidence-based revision planning, a one-time AI Study Toolkit, recurring Pro access, and future school cohorts.

## Local setup

1. Copy `.env.example` to `.env.local` and configure Supabase, Groq and Stripe.
2. Apply `supabase/migrations/20260810113000_rebuild_access_model.sql` to the linked StudyWith project.
3. Run `npm install` and `npm run dev`.
4. Configure the Stripe webhook endpoint as `/api/stripe/webhook` for checkout, subscription and invoice events.

The legacy `users.subscribed` column remains only for safe rollback. All v2 authorization is derived from `entitlements`.
