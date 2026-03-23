import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAdministration } from "@/lib/admin/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  stepOrder: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["approval", "review", "task", "payment", "notification"]),
  approverMode: z.enum(["user", "manager", "department_role", "dynamic"]),
  approverUserId: z.uuid().optional().nullable(),
  approverDepartmentId: z.uuid().optional().nullable(),
  minApprovals: z.number().int().positive().default(1),
  slaHours: z.number().int().positive().default(24),
  conditionJson: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await resolveRuntimeActor();
  const service = createSupabaseServiceRoleClient();

  if (!(await canManageAdministration(actor, service))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let payload: z.infer<typeof stepSchema>;

  try {
    payload = stepSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid step payload." }, { status: 400 });
  }

  const { id } = await params;
  const { error } = await service.from("workflow_template_steps").insert({
    template_id: id,
    step_order: payload.stepOrder,
    name: payload.name,
    kind: payload.kind,
    approver_mode: payload.approverMode,
    approver_user_id: payload.approverUserId ?? null,
    approver_department_id: payload.approverDepartmentId ?? null,
    min_approvals: payload.minApprovals,
    sla_hours: payload.slaHours,
    condition_json: payload.conditionJson,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
