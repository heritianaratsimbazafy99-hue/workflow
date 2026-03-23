import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/env/server";
import { processWorkflowReminders } from "@/lib/workflow/cron";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized cron invocation." },
    { status: 401 },
  );
}

export async function GET() {
  if (!hasCronSecret()) {
    return NextResponse.json(
      { error: "Missing CRON_SECRET configuration." },
      { status: 503 },
    );
  }

  const headerList = await headers();
  const authorization = headerList.get("authorization");

  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized();
  }

  const result = await processWorkflowReminders();

  return NextResponse.json(result);
}
