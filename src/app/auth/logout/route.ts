import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  return redirectTo(request, "/login");
}
