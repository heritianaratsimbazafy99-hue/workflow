import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { RuntimeActor } from "@/lib/workflow/runtime";

export type WorkflowRequestRecord = {
  id: string;
  reference: string;
  requester_id: string;
  request_type_id: string;
  workflow_template_id: string | null;
  title: string;
  description: string;
  amount: number | null;
  currency: string;
  priority: "low" | "normal" | "high" | "critical";
  status:
    | "draft"
    | "submitted"
    | "in_review"
    | "needs_changes"
    | "approved"
    | "rejected"
    | "completed"
    | "cancelled";
  current_step_order: number | null;
  current_assignee_id: string | null;
  due_at: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function findRequestByReferenceOrId(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  referenceOrId: string,
) {
  const query = service.from("requests").select("*");
  const { data } = isUuid(referenceOrId)
    ? await query.eq("id", referenceOrId).maybeSingle()
    : await query.eq("reference", referenceOrId).maybeSingle();

  return (data as WorkflowRequestRecord | null) ?? null;
}

export async function actorCanAccessRequest(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  actor: RuntimeActor,
  request: WorkflowRequestRecord,
) {
  if (actor.mode !== "live") {
    return true;
  }

  if (actor.appRole === "admin") {
    return true;
  }

  if (request.requester_id === actor.id || request.current_assignee_id === actor.id) {
    return true;
  }

  const { count } = await service
    .from("request_step_instances")
    .select("id", { head: true, count: "exact" })
    .eq("request_id", request.id)
    .eq("approver_id", actor.id);

  return (count ?? 0) > 0;
}

export async function findAccessibleRequestByReferenceOrId(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  actor: RuntimeActor,
  referenceOrId: string,
) {
  const request = await findRequestByReferenceOrId(service, referenceOrId);

  if (!request) {
    return null;
  }

  return (await actorCanAccessRequest(service, actor, request)) ? request : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
