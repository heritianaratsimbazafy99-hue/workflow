import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAdministration } from "@/lib/admin/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80).optional().nullable(),
  username: z.string().trim().min(3).max(40).optional().nullable(),
  role: z.enum(["admin", "manager", "employee"]),
  departmentId: z.uuid().optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
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

  let payload: z.infer<typeof updateProfileSchema>;

  try {
    payload = updateProfileSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  }

  const { id } = await params;
  const { error } = await service
    .from("profiles")
    .update({
      display_name: payload.displayName || null,
      username: payload.username || null,
      role: payload.role,
      department_id: payload.departmentId ?? null,
      job_title: payload.jobTitle || null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
