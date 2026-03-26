import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Factory function - creates the client only at call time (not at module import).
// This prevents "supabaseUrl is required" errors during Next.js static build phases.
export function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
