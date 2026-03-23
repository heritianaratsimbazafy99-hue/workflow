import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function redirectTo(
  request: NextRequest,
  pathname: string,
  params?: Record<string, string>,
) {
  const url = new URL(pathname, request.url);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return NextResponse.redirect(url, {
    status: 303,
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return redirectTo(request, "/login", { error: "missing_credentials" });
  }

  const response = redirectTo(request, "/workspace");
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirectTo(request, "/login", { error: "auth_failed" });
  }

  return response;
}
