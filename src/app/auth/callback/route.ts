import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { safeRedirectPath } from "@/lib/redirects";

const RESET_PASSWORD_PATH = "/auth/reset-password";

function redirect(request: NextRequest, path: string | URL) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const isPasswordRecovery = next === RESET_PASSWORD_PATH;

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery needs the session that was just created so the
      // user can set a new password on the next page.
      if (isPasswordRecovery) return redirect(request, RESET_PASSWORD_PATH);

      // Email confirmation: end the session and ask the user to sign in
      // explicitly with the password they chose.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (!signOutError) {
        const verifiedUrl = new URL("/auth/verified", request.url);
        verifiedUrl.searchParams.set("next", next);
        return redirect(request, verifiedUrl);
      }
    }
  }

  return redirect(
    request,
    isPasswordRecovery ? "/auth/forgot-password?error=expired" : "/auth/login?error=confirmation",
  );
}
