import { hasPublicSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { hasSupabaseServiceRoleKey } from "@/lib/env/server";
import { dispatchNotifications } from "@/lib/notifications/service";
import { approvalInbox } from "@/lib/workflow/mock-data";
import { cronRunResultSchema } from "@/lib/workflow/types";
import { deriveUserLabel } from "@/lib/workflow/runtime";

type StepRow = {
  id: string;
  request_id: string;
  step_order: number;
  name: string;
  approver_id: string | null;
  status: string;
  due_at: string | null;
};

type RequestRow = {
  id: string;
  reference: string;
  title: string;
  current_step_order: number | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  role: "admin" | "manager" | "employee";
};

type SlaEventRow = {
  request_step_instance_id: string;
  recipient_id: string;
  event_kind: "reminder" | "escalation";
};

export async function processWorkflowReminders() {
  if (!hasPublicSupabaseEnv() || !hasSupabaseServiceRoleKey()) {
    const scannedRequests = approvalInbox.length;
    const remindersQueued = approvalInbox.filter(
      (item) => item.dueState === "soon" || item.status === "needs_changes",
    ).length;
    const escalationsQueued = approvalInbox.filter(
      (item) => item.dueState === "overdue" || item.priority === "critical",
    ).length;

    return cronRunResultSchema.parse({
      status: "ok",
      source: "mock",
      scannedRequests,
      remindersQueued,
      escalationsQueued,
      emailsQueued: Math.max(remindersQueued - 1, 1),
      auditLogsInserted: remindersQueued + escalationsQueued,
      timestamp: new Date().toISOString(),
    });
  }

  const service = createSupabaseServiceRoleClient();
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: stepRows } = await service
    .from("request_step_instances")
    .select("id, request_id, step_order, name, approver_id, status, due_at")
    .eq("status", "pending")
    .not("due_at", "is", null);

  const steps = (stepRows as StepRow[] | null) ?? [];
  const requestIds = uniqueValues(steps.map((step) => step.request_id));
  const approverIds = uniqueValues(
    steps.map((step) => step.approver_id).filter((value): value is string => Boolean(value)),
  );

  const [requestsResult, profilesResult, adminsResult, eventsResult] = await Promise.all([
    requestIds.length > 0
      ? service.from("requests").select("id, reference, title, current_step_order").in("id", requestIds)
      : Promise.resolve({ data: [] }),
    approverIds.length > 0
      ? service
          .from("profiles")
          .select("id, email, full_name, display_name, username, role")
          .in("id", approverIds)
      : Promise.resolve({ data: [] }),
    service
      .from("profiles")
      .select("id, email, full_name, display_name, username, role")
      .in("role", ["admin", "manager"]),
    steps.length > 0
      ? service
          .from("workflow_sla_events")
          .select("request_step_instance_id, recipient_id, event_kind")
          .in(
            "request_step_instance_id",
            steps.map((step) => step.id),
          )
      : Promise.resolve({ data: [] }),
  ]);

  const requestsById = toMap(
    (requestsResult.data as RequestRow[] | null) ?? [],
    (item) => item.id,
  );
  const profilesById = toMap(
    [
      ...((profilesResult.data as ProfileRow[] | null) ?? []),
      ...((adminsResult.data as ProfileRow[] | null) ?? []),
    ],
    (item) => item.id,
  );
  const adminProfiles = ((adminsResult.data as ProfileRow[] | null) ?? []).filter(
    (profile) => profile.role === "admin" || profile.role === "manager",
  );
  const existingEvents = new Set(
    ((eventsResult.data as SlaEventRow[] | null) ?? []).map(
      (event) => `${event.request_step_instance_id}:${event.recipient_id}:${event.event_kind}`,
    ),
  );

  let remindersQueued = 0;
  let escalationsQueued = 0;
  let emailsQueued = 0;
  let auditLogsInserted = 0;

  for (const step of steps) {
    if (!step.due_at) {
      continue;
    }

    const dueAt = new Date(step.due_at);
    const request = requestsById[step.request_id];

    if (!request) {
      continue;
    }

    if (dueAt.getTime() > now.getTime() && dueAt.getTime() <= soonThreshold.getTime()) {
      if (!step.approver_id) {
        continue;
      }

      const key = `${step.id}:${step.approver_id}:reminder`;

      if (existingEvents.has(key)) {
        continue;
      }

      const approver = profilesById[step.approver_id];

      if (!approver) {
        continue;
      }

      const dispatch = await dispatchNotifications({
        recipients: [
          {
            id: approver.id,
            email: approver.email,
            fullName: approver.full_name,
          },
        ],
        title: `Rappel SLA · ${request.reference}`,
        body: `${request.title} approche de son SLA sur l’étape ${step.name}.`,
        category: "sla",
        requestId: request.id,
        sendEmail: true,
        actionPath: `/requests/${request.reference}`,
        actionLabel: "Traiter maintenant",
      });

      await service.from("workflow_sla_events").insert({
        request_step_instance_id: step.id,
        request_id: request.id,
        recipient_id: approver.id,
        event_kind: "reminder",
        payload: {
          request_reference: request.reference,
          step_name: step.name,
        },
      });

      await service.from("audit_logs").insert({
        actor_id: null,
        entity_type: "request",
        entity_id: request.id,
        action: "sla_reminder_sent",
        payload: {
          step: step.name,
          recipient: deriveUserLabel(approver, { compact: true }),
        },
      });

      existingEvents.add(key);
      remindersQueued += 1;
      emailsQueued += dispatch.emailed;
      auditLogsInserted += 1;
      continue;
    }

    if (dueAt.getTime() > now.getTime()) {
      continue;
    }

    const recipients = uniqueProfiles(
      [
        step.approver_id ? profilesById[step.approver_id] ?? null : null,
        ...adminProfiles,
      ].filter((value): value is ProfileRow => Boolean(value)),
    );

    let escalationTriggered = false;

    for (const recipient of recipients) {
      const key = `${step.id}:${recipient.id}:escalation`;

      if (existingEvents.has(key)) {
        continue;
      }

      const dispatch = await dispatchNotifications({
        recipients: [
          {
            id: recipient.id,
            email: recipient.email,
            fullName: recipient.full_name,
          },
        ],
        title: `Escalade SLA · ${request.reference}`,
        body: `${request.title} est hors SLA sur l’étape ${step.name}.`,
        category: "sla",
        requestId: request.id,
        sendEmail: true,
        actionPath: `/requests/${request.reference}`,
        actionLabel: "Ouvrir le dossier",
      });

      await service.from("workflow_sla_events").insert({
        request_step_instance_id: step.id,
        request_id: request.id,
        recipient_id: recipient.id,
        event_kind: "escalation",
        payload: {
          request_reference: request.reference,
          step_name: step.name,
        },
      });

      existingEvents.add(key);
      escalationsQueued += 1;
      emailsQueued += dispatch.emailed;
      escalationTriggered = true;
    }

    if (escalationTriggered) {
      await service.from("audit_logs").insert({
        actor_id: null,
        entity_type: "request",
        entity_id: request.id,
        action: "sla_escalated",
        payload: {
          step: step.name,
          due_at: step.due_at,
        },
      });
      auditLogsInserted += 1;
    }
  }

  return cronRunResultSchema.parse({
    status: "ok",
    source: "configured",
    scannedRequests: steps.length,
    remindersQueued,
    escalationsQueued,
    emailsQueued,
    auditLogsInserted,
    timestamp: new Date().toISOString(),
  });
}

function uniqueValues<T>(items: T[]) {
  return Array.from(new Set(items));
}

function toMap<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[getKey(item)] = item;
    return accumulator;
  }, {});
}

function uniqueProfiles(items: ProfileRow[]) {
  return Object.values(
    items.reduce<Record<string, ProfileRow>>((accumulator, item) => {
      accumulator[item.id] = item;
      return accumulator;
    }, {}),
  );
}
