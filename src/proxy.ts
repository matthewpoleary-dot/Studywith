import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

export const config = {
  matcher: ["/app/:path*"],
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Create a Supabase client using request cookies (Edge-compatible)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate the session (getUser makes a network call to verify the JWT)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check subscription status via service-role client (bypasses RLS)
  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: userData } = await adminClient
    .from("users")
    .select("subscribed")
    .eq("id", user.id)
    .single();

  // Auto-create the users row if the DB trigger never fired
  if (!userData) {
    await adminClient
      .from("users")
      .upsert(
        { id: user.id, email: user.email ?? "", subscribed: false },
        { onConflict: "id" },
      );
  }

  if (!userData?.subscribed) {
    return NextResponse.redirect(
      new URL("/?checkout=required", request.url),
    );
  }

  return response;
}
