import { NextResponse } from "next/server";
import { z } from "zod";
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
  let payload: z.infer<typeof resubmitSchema>;

  try {
    payload = resubmitSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request resubmission payload." },
      { status: 400 },
    );
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
