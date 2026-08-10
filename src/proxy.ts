import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

export const config = { matcher: ["/app/:path*"] };

export async function proxy(request: NextRequest) { let response = NextResponse.next({ request }); const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => { values.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } }); const { data: { user } } = await supabase.auth.getUser(); if (!user) { const url = new URL("/auth/login", request.url); url.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`); return NextResponse.redirect(url); } return response; }
