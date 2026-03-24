import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getEmailConfigHealth, hasCronSecret } from "@/lib/env/server";
import {
  canUseSupabaseLiveMode,
  deriveUserHandle,
  deriveUserLabel,
  resolveRuntimeActor,
  type RuntimeActor,
  type RuntimeMode,
} from "@/lib/workflow/runtime";
import type { FormSection } from "@/lib/workflow/types";

type DepartmentRow = {
  id: string;
  code: string;
  name: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
  display_name: string | null;
  username: string | null;
  role: "admin" | "manager" | "employee";
  department_id: string | null;
  job_title: string | null;
};

type RequestTypeRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  department_id: string | null;
  default_sla_hours: number;
  is_active: boolean;
};

type RequestTypeFieldDefinitionRow = {
  id: string;
  request_type_id: string;
  section_key: string;
  section_title: string;
  field_key: string;
  label: string;
  field_type: "text" | "textarea" | "select" | "currency" | "date" | "checkbox";
  helper_text: string;
  placeholder: string | null;
  required: boolean;
  width: "full" | "half";
  options_json: unknown;
  sort_order: number;
  is_active: boolean;
};

type WorkflowTemplateRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  request_type_id: string | null;
  version: number;
  is_active: boolean;
};

type WorkflowTemplateStepRow = {
  id: string;
  template_id: string;
  step_order: number;
  name: string;
  kind: "approval" | "review" | "task" | "payment" | "notification";
  approver_mode: "user" | "manager" | "department_role" | "dynamic";
  approver_user_id: string | null;
  approver_department_id: string | null;
  min_approvals: number;
  sla_hours: number;
  condition_json: Record<string, unknown> | null;
};

export type AdminProfile = {
  id: string;
  label: string;
  fullName: string;
  handle: string | null;
  email: string | null;
  role: ProfileRow["role"];
  departmentId: string | null;
  jobTitle: string | null;
};

export type AdminDepartment = DepartmentRow;

export type AdminRequestType = {
  id: string;
  code: string;
  name: string;
  description: string;
  departmentId: string | null;
  departmentName: string;
  defaultSlaHours: number;
  isActive: boolean;
  formSections: FormSection[];
};

export type AdminWorkflowStep = {
  id: string;
  stepOrder: number;
  name: string;
  kind: WorkflowTemplateStepRow["kind"];
  approverMode: WorkflowTemplateStepRow["approver_mode"];
  approverUserId: string | null;
  approverDepartmentId: string | null;
  minApprovals: number;
  slaHours: number;
  conditionJson: Record<string, unknown> | null;
};

export type AdminWorkflowTemplate = {
  id: string;
  code: string;
  name: string;
  description: string;
  requestTypeId: string | null;
  requestTypeName: string;
  version: number;
  isActive: boolean;
  steps: AdminWorkflowStep[];
};

export type AdminControlTowerData = {
  mode: RuntimeMode;
  actor: RuntimeActor;
  canManage: boolean;
  ops: {
    actorEmail: string | null;
    emailProvider: "console" | "resend";
    emailConfigured: boolean;
    cronProtected: boolean;
    appBaseUrl: string | null;
    cronEndpoint: string;
    emailFrom: string | null;
    emailReplyTo: string | null;
    emailIssues: string[];
    emailWarnings: string[];
  };
  departments: AdminDepartment[];
  profiles: AdminProfile[];
  requestTypes: AdminRequestType[];
  templates: AdminWorkflowTemplate[];
};

export async function getAdminControlTowerData(): Promise<AdminControlTowerData> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      canManage: true,
      ops: {
        actorEmail: actor.email,
        emailProvider: "console",
        emailConfigured: false,
        cronProtected: false,
        appBaseUrl: null,
        cronEndpoint: "/api/cron/process-reminders",
        emailFrom: null,
        emailReplyTo: null,
        emailIssues: [],
        emailWarnings: [],
      },
      departments: [],
      profiles: [],
      requestTypes: [],
      templates: [],
    };
  }

  const service = createSupabaseServiceRoleClient();
  const canManage = await canManageAdministration(actor, service);
  const emailHealth = getEmailConfigHealth();
  const appBaseUrl = emailHealth.appBaseUrlValid ? emailHealth.appBaseUrl : null;
  const ops = {
    actorEmail: actor.email,
    emailProvider: emailHealth.provider,
    emailConfigured: emailHealth.canSendTransactionalEmail,
    cronProtected: hasCronSecret(),
    appBaseUrl,
    cronEndpoint: appBaseUrl
      ? new URL("/api/cron/process-reminders", appBaseUrl).toString()
      : "/api/cron/process-reminders",
    emailFrom: emailHealth.emailFrom,
    emailReplyTo: emailHealth.emailReplyTo,
    emailIssues: emailHealth.issues,
    emailWarnings: emailHealth.warnings,
  };

  if (!canManage) {
    return {
      mode: "live",
      actor,
      canManage,
      ops,
      departments: [],
      profiles: [],
      requestTypes: [],
      templates: [],
    };
  }

  const [departmentsResult, profilesResult, requestTypesResult, fieldDefsResult, templatesResult, stepsResult] =
    await Promise.all([
      service.from("departments").select("id, code, name").order("name", { ascending: true }),
      service
        .from("profiles")
        .select("id, email, full_name, display_name, username, role, department_id, job_title")
        .order("created_at", { ascending: true }),
      service
        .from("request_types")
        .select("id, code, name, description, department_id, default_sla_hours, is_active")
        .order("name", { ascending: true }),
      service
        .from("request_type_field_definitions")
        .select(
          "id, request_type_id, section_key, section_title, field_key, label, field_type, helper_text, placeholder, required, width, options_json, sort_order, is_active",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      service
        .from("workflow_templates")
        .select("id, code, name, description, request_type_id, version, is_active")
        .order("name", { ascending: true }),
      service
        .from("workflow_template_steps")
        .select(
          "id, template_id, step_order, name, kind, approver_mode, approver_user_id, approver_department_id, min_approvals, sla_hours, condition_json",
        )
        .order("step_order", { ascending: true }),
    ]);

  const departments = ((departmentsResult.data as DepartmentRow[] | null) ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
  }));
  const departmentById = Object.fromEntries(departments.map((item) => [item.id, item]));
  const profiles = ((profilesResult.data as ProfileRow[] | null) ?? []).map((profile) => ({
    id: profile.id,
    label: deriveUserLabel(profile, { compact: true }),
    fullName: deriveUserLabel(profile, { compact: false }),
    handle: deriveUserHandle(profile),
    email: profile.email,
    role: profile.role,
    departmentId: profile.department_id,
    jobTitle: profile.job_title,
  }));
  const fieldDefinitions =
    (fieldDefsResult.data as RequestTypeFieldDefinitionRow[] | null) ?? [];
  const fieldsByRequestType = groupBy(fieldDefinitions, (item) => item.request_type_id);
  const requestTypes = ((requestTypesResult.data as RequestTypeRow[] | null) ?? []).map(
    (item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      departmentId: item.department_id,
      departmentName: item.department_id
        ? departmentById[item.department_id]?.name ?? "Sans département"
        : "Sans département",
      defaultSlaHours: item.default_sla_hours,
      isActive: item.is_active,
      formSections: mapFieldDefinitionsToSections(fieldsByRequestType[item.id] ?? []),
    }),
  );

  const requestTypeById = Object.fromEntries(requestTypes.map((item) => [item.id, item]));
  const templateStepsByTemplate = groupBy(
    (stepsResult.data as WorkflowTemplateStepRow[] | null) ?? [],
    (item) => item.template_id,
  );
  const templates = ((templatesResult.data as WorkflowTemplateRow[] | null) ?? []).map(
    (template) => ({
      id: template.id,
      code: template.code,
      name: template.name,
      description: template.description,
      requestTypeId: template.request_type_id,
      requestTypeName: template.request_type_id
        ? requestTypeById[template.request_type_id]?.name ?? "Type supprimé"
        : "Aucun type",
      version: template.version,
      isActive: template.is_active,
      steps: (templateStepsByTemplate[template.id] ?? []).map((step) => ({
        id: step.id,
        stepOrder: step.step_order,
        name: step.name,
        kind: step.kind,
        approverMode: step.approver_mode,
        approverUserId: step.approver_user_id,
        approverDepartmentId: step.approver_department_id,
        minApprovals: step.min_approvals,
        slaHours: step.sla_hours,
        conditionJson: step.condition_json ?? {},
      })),
    }),
  );

  return {
    mode: "live",
    actor,
    canManage,
    ops,
    departments,
    profiles,
    requestTypes,
    templates,
  };
}

export async function canManageAdministration(
  actor: RuntimeActor,
  service = createSupabaseServiceRoleClient(),
) {
  if (actor.mode !== "live") {
    return true;
  }

  const { data: actorProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();

  if ((actorProfile as { role?: string } | null)?.role === "admin") {
    return true;
  }

  const { count } = await service
    .from("profiles")
    .select("id", { head: true, count: "exact" })
    .eq("role", "admin");

  return (count ?? 0) === 0;
}

export function mapFieldDefinitionsToSections(fieldDefinitions: RequestTypeFieldDefinitionRow[]) {
  const grouped = groupBy(fieldDefinitions, (item) => item.section_key);

  return Object.values(grouped).map((sectionFields) => {
    const [firstField] = sectionFields;

    return {
      key: firstField.section_key,
      title: firstField.section_title,
      description:
        firstField.section_title === "Informations complémentaires"
          ? "Champs métier affichés selon le type de demande."
          : `Bloc ${firstField.section_title.toLowerCase()} du formulaire.`,
      fields: sectionFields
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((field) => ({
          id: field.id,
          key: field.field_key,
          label: field.label,
          type: field.field_type,
          helper: field.helper_text,
          required: field.required,
          placeholder: field.placeholder,
          options: Array.isArray(field.options_json)
            ? field.options_json.filter((item): item is string => typeof item === "string")
            : [],
          width: field.width,
        })),
    } satisfies FormSection;
  });
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = [...(accumulator[key] ?? []), item];
    return accumulator;
  }, {});
}
