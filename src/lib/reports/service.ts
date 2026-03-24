import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  canUseSupabaseLiveMode,
  deriveUserLabel,
  resolveRuntimeActor,
} from "@/lib/workflow/runtime";
import { approvalInbox, dashboardMetrics } from "@/lib/workflow/mock-data";
import type {
  CurrentUser,
  ReportApproverLoad,
  ReportBreakdown,
  ReportMetric,
} from "@/lib/workflow/types";

type RequestRow = {
  id: string;
  reference: string;
  requester_id: string;
  current_assignee_id: string | null;
  request_type_id: string;
  title: string;
  priority: "low" | "normal" | "high" | "critical";
  status: string;
  submitted_at: string | null;
  decided_at: string | null;
  due_at: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
};

type RequestTypeRow = {
  id: string;
  name: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
};

type StepRow = {
  id: string;
  request_id: string;
  approver_id: string | null;
  status: string;
  due_at: string | null;
};

export type ReportsData = {
  mode: "demo" | "live";
  actor: CurrentUser & { mode: "demo" | "live" };
  canView: boolean;
  metrics: ReportMetric[];
  byStatus: ReportBreakdown[];
  byType: ReportBreakdown[];
  approverLoad: ReportApproverLoad[];
  exportRows: string[][];
};

export async function getReportsData(): Promise<ReportsData> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      canView: true,
      metrics: dashboardMetrics.map((metric) => ({
        label: metric.label,
        value: metric.value,
        detail: metric.trend,
        tone: metric.tone,
      })),
      byStatus: [
        { label: "En revue", value: approvalInbox.length },
        { label: "À corriger", value: 1 },
      ],
      byType: [
        { label: "Budget", value: 2 },
        { label: "Réparation", value: 1 },
      ],
      approverLoad: [
        { approver: "Julien A.", pendingCount: 3, overdueCount: 1 },
      ],
      exportRows: [],
    };
  }

  if (actor.appRole === "employee") {
    return {
      mode: "live",
      actor,
      canView: false,
      metrics: [],
      byStatus: [],
      byType: [],
      approverLoad: [],
      exportRows: [],
    };
  }

  const service = createSupabaseServiceRoleClient();
  const [requestsResult, requestTypesResult, profilesResult, stepsResult] =
    await Promise.all([
      service.from("requests").select("*").order("created_at", { ascending: false }).limit(300),
      service.from("request_types").select("id, name"),
      service.from("profiles").select("id, email, full_name, display_name, username"),
      service
        .from("request_step_instances")
        .select("id, request_id, approver_id, status, due_at")
        .eq("status", "pending"),
    ]);

  const requests = (requestsResult.data as RequestRow[] | null) ?? [];
  const requestTypes = ((requestTypesResult.data as RequestTypeRow[] | null) ?? []).reduce<
    Record<string, RequestTypeRow>
  >((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
  const profiles = ((profilesResult.data as ProfileRow[] | null) ?? []).reduce<
    Record<string, ProfileRow>
  >((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
  const steps = (stepsResult.data as StepRow[] | null) ?? [];

  const active = requests.filter((request) =>
    ["submitted", "in_review", "needs_changes"].includes(request.status),
  );
  const completed = requests.filter((request) =>
    ["approved", "completed", "rejected"].includes(request.status),
  );
  const avgCycleHours = average(
    completed
      .map((request) => {
        const submitted = request.submitted_at ?? request.created_at;
        const decided = request.decided_at;

        if (!submitted || !decided) {
          return null;
        }

        return (new Date(decided).getTime() - new Date(submitted).getTime()) / 36e5;
      })
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );
  const overdueSteps = steps.filter(
    (step) => step.due_at && new Date(step.due_at).getTime() < Date.now(),
  );
  const approvalRate =
    completed.length > 0
      ? Math.round(
          (requests.filter((request) =>
            ["approved", "completed"].includes(request.status),
          ).length /
            completed.length) *
            100,
        )
      : 0;

  const metrics: ReportMetric[] = [
    {
      label: "Demandes actives",
      value: String(active.length),
      detail: `${requests.length} demandes suivies`,
      tone: active.length > 0 ? "warning" : "good",
    },
    {
      label: "Taux d’approbation",
      value: `${approvalRate}%`,
      detail: "sur les dossiers clôturés",
      tone: approvalRate >= 80 ? "good" : "neutral",
    },
    {
      label: "Cycle moyen",
      value: avgCycleHours ? `${avgCycleHours.toFixed(1)} h` : "n/a",
      detail: "soumission à décision",
      tone: avgCycleHours && avgCycleHours > 48 ? "warning" : "good",
    },
    {
      label: "Étapes hors SLA",
      value: String(overdueSteps.length),
      detail: "en attente d’action",
      tone: overdueSteps.length > 0 ? "warning" : "good",
    },
  ];

  const byStatus = groupCounts(
    requests.map((request) => humanizeStatus(request.status)),
  );
  const byType = groupCounts(
    requests.map((request) => requestTypes[request.request_type_id]?.name ?? "Type inconnu"),
  );
  const approverLoad = groupApproverLoad(steps, profiles);

  const exportRows = requests.map((request) => [
    request.reference,
    request.title,
    requestTypes[request.request_type_id]?.name ?? "Type inconnu",
    humanizeStatus(request.status),
    request.priority,
    deriveUserLabel(profiles[request.requester_id], { compact: false }),
    request.current_assignee_id
      ? deriveUserLabel(profiles[request.current_assignee_id], { compact: false })
      : "",
    request.submitted_at ?? request.created_at,
    request.decided_at ?? "",
    request.due_at ?? "",
    request.amount !== null ? `${request.amount} ${request.currency}` : "",
  ]);

  return {
    mode: "live",
    actor,
    canView: true,
    metrics,
    byStatus,
    byType,
    approverLoad,
    exportRows,
  };
}

function groupCounts(items: string[]): ReportBreakdown[] {
  const counts = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item] = (accumulator[item] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

function groupApproverLoad(
  steps: StepRow[],
  profiles: Record<string, ProfileRow>,
): ReportApproverLoad[] {
  const grouped = steps.reduce<
    Record<string, { pendingCount: number; overdueCount: number }>
  >((accumulator, step) => {
    if (!step.approver_id) {
      return accumulator;
    }

    const current = accumulator[step.approver_id] ?? {
      pendingCount: 0,
      overdueCount: 0,
    };

    current.pendingCount += 1;

    if (step.due_at && new Date(step.due_at).getTime() < Date.now()) {
      current.overdueCount += 1;
    }

    accumulator[step.approver_id] = current;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .map(([approverId, counts]) => ({
      approver: deriveUserLabel(profiles[approverId], { compact: true }),
      pendingCount: counts.pendingCount,
      overdueCount: counts.overdueCount,
    }))
    .sort((left, right) => right.pendingCount - left.pendingCount)
    .slice(0, 8);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function humanizeStatus(status: string) {
  switch (status) {
    case "in_review":
      return "En revue";
    case "needs_changes":
      return "À corriger";
    case "approved":
      return "Approuvée";
    case "rejected":
      return "Rejetée";
    case "completed":
      return "Terminée";
    case "submitted":
      return "Soumise";
    default:
      return "Brouillon";
  }
}
