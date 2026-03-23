import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAdministration } from "@/lib/admin/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const requestTypeSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(""),
  departmentId: z.uuid().optional().nullable(),
  defaultSlaHours: z.number().int().positive(),
  isActive: z.boolean().default(true),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await resolveRuntimeActor();
  const service = createSupabaseServiceRoleClient();

  if (!(await canManageAdministration(actor, service))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let payload: z.infer<typeof requestTypeSchema>;

  try {
    payload = requestTypeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request type payload." }, { status: 400 });
  }

  const { id } = await params;
  const { error } = await service
    .from("request_types")
    .update({
      code: payload.code,
      name: payload.name,
      description: payload.description,
      department_id: payload.departmentId ?? null,
      default_sla_hours: payload.defaultSlaHours,
      is_active: payload.isActive,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
