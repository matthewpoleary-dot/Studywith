-- ============================================================
-- StudyWith SaaS Professionalization Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Module 1a: room_assignments — drop base64, add image_url ─
ALTER TABLE room_assignments
  ADD COLUMN IF NOT EXISTS image_url text;

-- Migrate any existing base64 rows: upload them via the
-- /api/admin/migrate-images route after deploying, then run:
--   ALTER TABLE room_assignments DROP COLUMN IF EXISTS image_base64;
--   ALTER TABLE room_assignments DROP COLUMN IF EXISTS image_mime;
-- For now, keep old columns until migration is confirmed complete.
-- They are no longer written to by any new code.

-- ── Module 1b: sessions — add room_id FK ─────────────────────
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sessions_room_id_idx ON sessions(room_id);

-- ── Module 2: fix proxy auto-subscribe bug ───────────────────
-- The proxy.ts no longer sets subscribed:true. New users start
-- as subscribed:false. Existing users are unaffected.
-- If you want to grandfather existing users:
-- UPDATE users SET subscribed = true WHERE created_at < NOW();

-- ── Module 3: RLS — sessions publicly readable by receipt ────
-- Allow anyone to read a session if they know its ID (for
-- shareable receipts). The service-role key bypasses RLS, so
-- the LearningReceipt server component already works. This
-- policy allows the anon key to fetch individual sessions.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own sessions
CREATE POLICY IF NOT EXISTS "sessions_owner" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can read a completed session (has a receipt) by ID —
-- used for shareable /receipt/[id] links
CREATE POLICY IF NOT EXISTS "sessions_public_receipt" ON sessions
  FOR SELECT USING (receipt IS NOT NULL);

-- ── Module 4: rate_limits table ──────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket   text NOT NULL,   -- minute window: "YYYY-MM-DDTHH:MM"
  count    int  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

-- Auto-clean buckets older than 10 minutes (optional cron)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('clean-rate-limits', '*/10 * * * *',
--   $$DELETE FROM rate_limits WHERE bucket < to_char(NOW() - interval '10 minutes','YYYY-MM-DD"T"HH24:MI')$$);
