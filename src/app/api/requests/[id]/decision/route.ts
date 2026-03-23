import { NextResponse } from "next/server";
import { z } from "zod";
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
  let payload: z.infer<typeof decisionSchema>;

  try {
    payload = decisionSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid workflow decision payload." },
      { status: 400 },
    );
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
