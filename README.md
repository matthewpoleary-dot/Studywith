# StudyWith

StudyWith is an AI study workspace for Irish Leaving Certificate students. Rather than handing over answers, it is
built to help students think: a Socratic tutor that works from photos of their own work, flashcards and quizzes
generated from their own class notes, and a weekly planner weighted by confidence and priorities.

## Features

- **Socratic AI tutor**: streaming chat that accepts photos, screenshots, PDFs and saved notes. It picks the subject
  automatically and keeps conversation history per session.
- **Notes to practice**: upload handwritten pages, PDFs or pasted text. StudyWith transcribes them once, then
  generates flashcards and multiple-choice quizzes grounded in that material.
- **Weekly planner**: gives each subject sessions weighted by confidence and urgency, and schedules them around the
  recurring commitments a student describes in plain English (e.g. "football Tuesday 6-8pm").
- **Accounts and billing**: email/password auth with verification and password reset, a free tier, a one-time
  toolkit purchase and a Pro subscription through Stripe, plus self-service account deletion.

## Tech stack

| Area      | Choice                                                            |
| --------- | ----------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, route handlers), React 19, TypeScript     |
| Styling   | Tailwind CSS 4, Radix UI primitives                               |
| Data      | Supabase: Postgres with row-level security, Auth, private Storage |
| AI        | Groq: Llama 3.3 70B for text, a Qwen vision model for images      |
| Payments  | Stripe Checkout, Billing Portal and webhooks                      |

## How it works

- **Server-side authorisation.** Every API route resolves the signed-in user from the Supabase session cookie and
  scopes every query to that user's ID. Row-level security policies back this up in the database, and attachment
  metadata is readable only by the server.
- **Metered AI usage.** A Postgres function (`consume_ai_action`) checks entitlements and decrements credits in a
  single transaction with row locking. If the model call or a later save fails, the action is refunded with
  `refund_ai_action`, so students are never charged for errors.
- **Direct-to-storage uploads.** The browser uploads files straight to a private Supabase Storage bucket under the
  user's own folder. The server then checks each path, size and MIME type before reading the file, so large files
  never pass through the API route body.
- **Streaming responses.** The tutor streams newline-delimited JSON events (`subject`, `delta`, `done`, `error`). The
  client renders tokens as they arrive and rolls back optimistic state if the stream fails.
- **Idempotent webhooks.** Stripe events are recorded by ID before processing, so retried deliveries are ignored.

## Project structure

```
src/
  app/
    api/          Route handlers: tutor, materials, planner, attachments, Stripe, account
    app/          Signed-in workspace (dashboard, tutor, notes, planner, settings)
    auth/         Sign up, sign in, email verification and password reset
  components/     Feature components and UI primitives
  lib/            Supabase clients, access control, file handling, planner allocation
  proxy.ts        Refreshes the session and protects /app routes
supabase/
  migrations/     Schema, RLS policies and database functions
```

## Running locally

Requirements: Node.js 20+, a Supabase project, a Groq API key and a Stripe account in test mode.

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Apply the SQL files in `supabase/migrations/` in filename order. They migrate an existing StudyWith database to
   the current access model, so they expect the original base tables (`users`, `sessions`, `study_materials`,
   `flashcards`, `quiz_questions`, `study_plans`) to exist already.
3. Install dependencies and start the dev server:

   ```bash
   npm ci
   npm run dev
   ```

4. For payments, point a Stripe webhook at `/api/stripe/webhook` for `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed` events. Locally
   you can use `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Scripts

| Command                | Purpose                        |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Start the development server   |
| `npm run build`        | Production build               |
| `npm run lint`         | ESLint                         |
| `npm run typecheck`    | TypeScript with no emit        |
| `npm run format:check` | Check formatting with Prettier |
