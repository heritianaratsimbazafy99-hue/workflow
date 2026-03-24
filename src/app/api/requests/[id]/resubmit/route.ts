import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveModeIssue, resolveRuntimeActor } from "@/lib/workflow/runtime";
import { resubmitWorkflowRequest } from "@/lib/workflow/engine";

export const dynamic = "force-dynamic";

const resubmitSchema = z.object({
  comment: z.string().trim().max(2000).default(""),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await resolveRuntimeActor();
  const liveModeIssue = getLiveModeIssue(actor);
  let payload: z.infer<typeof resubmitSchema>;

  try {
    payload = resubmitSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request resubmission payload." },
      { status: 400 },
    );
  }

  if (liveModeIssue) {
    return NextResponse.json({ error: liveModeIssue.message }, { status: liveModeIssue.status });
  }

  try {
    const result = await resubmitWorkflowRequest({
      requestReferenceOrId: id,
      comment: payload.comment,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resubmit workflow request.",
      },
      { status: 500 },
    );
  }
}
