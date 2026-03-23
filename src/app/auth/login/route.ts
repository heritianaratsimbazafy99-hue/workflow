import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return redirectTo(request, "/login");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirectTo(request, "/login");
  }

  return redirectTo(request, "/workspace");
}
