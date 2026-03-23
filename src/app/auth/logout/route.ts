import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), {
    status: 303,
  });
}

export async function POST(request: NextRequest) {
  const response = redirectTo(request, "/login");
  const supabase = createSupabaseRouteHandlerClient(request, response);

  await supabase.auth.signOut();

  return response;
}
