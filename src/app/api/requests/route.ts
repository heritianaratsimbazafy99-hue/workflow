import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveModeIssue, resolveRuntimeActor } from "@/lib/workflow/runtime";
import { createWorkflowRequest } from "@/lib/workflow/engine";

export const dynamic = "force-dynamic";

const createRequestSchema = z.object({
  requestTypeCode: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  amount: z.number().nonnegative().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  dynamicFields: z.record(z.string(), z.union([z.string(), z.boolean()])).optional().nullable(),
});

export async function POST(request: Request) {
  const actor = await resolveRuntimeActor();
  const liveModeIssue = getLiveModeIssue(actor);
  let payload: z.infer<typeof createRequestSchema>;

  try {
    payload = createRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request creation payload." },
      { status: 400 },
    );
  }

  if (liveModeIssue) {
    return NextResponse.json({ error: liveModeIssue.message }, { status: liveModeIssue.status });
  }

  try {
    const result = await createWorkflowRequest(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create workflow request.",
      },
      { status: 500 },
    );
  }
}
