import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAdministration } from "@/lib/admin/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const templateSchema = z.object({
  code: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).default(""),
  requestTypeId: z.uuid().optional().nullable(),
  version: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
});

export async function POST(request: Request) {
  const actor = await resolveRuntimeActor();
  const service = createSupabaseServiceRoleClient();

  if (!(await canManageAdministration(actor, service))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let payload: z.infer<typeof templateSchema>;

  try {
    payload = templateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid template payload." }, { status: 400 });
  }

  const { error } = await service.from("workflow_templates").insert({
    code: payload.code,
    name: payload.name,
    description: payload.description,
    request_type_id: payload.requestTypeId ?? null,
    version: payload.version,
    is_active: payload.isActive,
    created_by: actor.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
