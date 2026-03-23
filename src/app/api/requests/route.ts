import { NextResponse } from "next/server";
import { z } from "zod";
import { createWorkflowRequest } from "@/lib/workflow/engine";

export const dynamic = "force-dynamic";

const createRequestSchema = z.object({
  requestTypeCode: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  amount: z.number().nonnegative().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof createRequestSchema>;

  try {
    payload = createRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request creation payload." },
      { status: 400 },
    );
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
