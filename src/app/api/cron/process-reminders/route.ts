import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasCronSecret, hasSupabaseServiceRoleKey } from "@/lib/env/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { processWorkflowReminders } from "@/lib/workflow/cron";

export const dynamic = "force-dynamic";

const JOB_NAME = "process-reminders";

type CronRunMeta = {
  requestPath: string;
  runKey: string | null;
  triggerSource: string;
  invokedBy: string;
};

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized cron invocation." },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: Request) {
  if (!hasCronSecret()) {
    return NextResponse.json(
      { error: "Missing CRON_SECRET configuration." },
      { status: 503 },
    );
  }

  const headerList = await headers();
  const providedSecret =
    extractBearerToken(headerList.get("authorization") ?? "") ??
    headerList.get("x-cron-secret");

  if (!isSecretValid(providedSecret, process.env.CRON_SECRET ?? "")) {
    return unauthorized();
  }

  const cronMeta: CronRunMeta = {
    requestPath: new URL(request.url).pathname,
    runKey: headerList.get("x-idempotency-key"),
    triggerSource: detectCronSource(headerList),
    invokedBy:
      headerList.get("user-agent") ??
      headerList.get("x-forwarded-for") ??
      "unknown",
  };
  const service = hasSupabaseServiceRoleKey() ? createSupabaseServiceRoleClient() : null;
  const cronRun = service ? await beginCronRun(service, cronMeta) : null;

  if (cronRun?.response) {
    return NextResponse.json(cronRun.response, { status: cronRun.status });
  }

  try {
    const result = await processWorkflowReminders();

    if (service && cronRun?.runId) {
      await service
        .from("workflow_cron_runs")
        .update({
          status: "succeeded",
          result,
          completed_at: new Date().toISOString(),
        })
        .eq("id", cronRun.runId);
    }

    return NextResponse.json({
      ...result,
      runId: cronRun?.runId ?? null,
      triggerSource: cronMeta.triggerSource,
    });
  } catch (error) {
    if (service && cronRun?.runId) {
      await service
        .from("workflow_cron_runs")
        .update({
          status: "failed",
          error_message:
            error instanceof Error
              ? error.message
              : "Unhandled cron execution error.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", cronRun.runId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cron execution failed.",
        runId: cronRun?.runId ?? null,
        triggerSource: cronMeta.triggerSource,
      },
      { status: 500 },
    );
  }
}

async function beginCronRun(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  meta: CronRunMeta,
) {
  if (meta.runKey) {
    const { data: existing } = await service
      .from("workflow_cron_runs")
      .select("id, status, result, completed_at")
      .eq("job_name", JOB_NAME)
      .eq("run_key", meta.runKey)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status === "started") {
        return {
          status: 202,
          response: {
            ok: true,
            duplicate: true,
            note: "Cron déjà en cours pour cette clé d'idempotence.",
            runId: existing.id,
            triggerSource: meta.triggerSource,
          },
        };
      }

      return {
        status: 200,
        response: {
          ok: true,
          duplicate: true,
          note: "Cron déjà exécuté pour cette clé d'idempotence.",
          runId: existing.id,
          previousResult: existing.result,
          completedAt: existing.completed_at,
          triggerSource: meta.triggerSource,
        },
      };
    }
  }

  const { data, error } = await service
    .from("workflow_cron_runs")
    .insert({
      job_name: JOB_NAME,
      run_key: meta.runKey,
      trigger_source: meta.triggerSource,
      request_path: meta.requestPath,
      invoked_by: meta.invokedBy,
      status: "started",
      result: {},
    })
    .select("id")
    .single();

  if (error && meta.runKey) {
    const { data: existing } = await service
      .from("workflow_cron_runs")
      .select("id, status, result, completed_at")
      .eq("job_name", JOB_NAME)
      .eq("run_key", meta.runKey)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        status: 200,
        response: {
          ok: true,
          duplicate: true,
          note: "Cron déjà journalisé pour cette clé d'idempotence.",
          runId: existing.id,
          previousResult: existing.result,
          completedAt: existing.completed_at,
          triggerSource: meta.triggerSource,
        },
      };
    }
  }

  return {
    runId: data?.id ?? null,
    response: null,
    status: 200,
  };
}

function extractBearerToken(headerValue: string) {
  if (!headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

function isSecretValid(receivedSecret: string | null | undefined, expectedSecret: string) {
  if (!receivedSecret) {
    return false;
  }

  const receivedBuffer = Buffer.from(receivedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function detectCronSource(headerList: Awaited<ReturnType<typeof headers>>) {
  const explicitSource =
    headerList.get("x-noria-cron-source") ??
    headerList.get("x-scheduler-source");

  if (explicitSource) {
    return explicitSource;
  }

  const userAgent = headerList.get("user-agent") ?? "";

  if (userAgent.includes("vercel-cron/1.0")) {
    return "vercel-cron";
  }

  if (userAgent.toLowerCase().includes("github-actions")) {
    return "github-actions";
  }

  return "external-scheduler";
}
