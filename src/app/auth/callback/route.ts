import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requested = request.nextUrl.searchParams.get("next") ?? "/app";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/app";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });

      if (!signOutError) {
        const verifiedUrl = new URL("/auth/verified", request.url);
        verifiedUrl.searchParams.set("next", next);
        const response = NextResponse.redirect(verifiedUrl);
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    }
  }

  const response = NextResponse.redirect(new URL("/auth/login?error=confirmation", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
