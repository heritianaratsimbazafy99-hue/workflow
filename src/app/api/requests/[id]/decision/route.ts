import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveModeIssue, resolveRuntimeActor } from "@/lib/workflow/runtime";
import { applyWorkflowDecision } from "@/lib/workflow/engine";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject", "return"]),
  comment: z.string().trim().max(2000).default(""),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await resolveRuntimeActor();
  const liveModeIssue = getLiveModeIssue(actor);
  let payload: z.infer<typeof decisionSchema>;

  try {
    payload = decisionSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid workflow decision payload." },
      { status: 400 },
    );
  }

  if (liveModeIssue) {
    return NextResponse.json({ error: liveModeIssue.message }, { status: liveModeIssue.status });
  }

  try {
    const result = await applyWorkflowDecision({
      requestReferenceOrId: id,
      decision: payload.decision,
      comment: payload.comment,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process workflow decision.",
      },
      { status: 500 },
    );
  }
}
