import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAdministration } from "@/lib/admin/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const fieldSchema = z.object({
  sectionKey: z.string().trim().min(1).max(60),
  sectionTitle: z.string().trim().min(1).max(120),
  fieldKey: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  fieldType: z.enum(["text", "textarea", "select", "currency", "date", "checkbox"]),
  helperText: z.string().trim().max(300).default(""),
  placeholder: z.string().trim().max(160).optional().nullable(),
  required: z.boolean().default(false),
  width: z.enum(["full", "half"]).default("full"),
  options: z.array(z.string()).default([]),
  sortOrder: z.number().int().positive(),
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

  let payload: z.infer<typeof fieldSchema>;

  try {
    payload = fieldSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid field payload." }, { status: 400 });
  }

  const { id } = await params;
  const { error } = await service
    .from("request_type_field_definitions")
    .update({
      section_key: payload.sectionKey,
      section_title: payload.sectionTitle,
      field_key: payload.fieldKey,
      label: payload.label,
      field_type: payload.fieldType,
      helper_text: payload.helperText,
      placeholder: payload.placeholder || null,
      required: payload.required,
      width: payload.width,
      options_json: payload.options,
      sort_order: payload.sortOrder,
      is_active: payload.isActive,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
