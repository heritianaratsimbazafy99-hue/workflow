import {
  approvalInbox,
  auditTimeline,
  getConversationMessages,
  getConversationPreview,
  getRequestDetail,
  requestTypes as mockRequestTypes,
  workflowTemplates as mockWorkflowTemplates,
} from "@/lib/workflow/mock-data";
import { dispatchNotifications } from "@/lib/notifications/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  canUseSupabaseLiveMode,
  formatUiTime,
  mapMessageRowToView,
  resolveRuntimeActor,
  type RuntimeActor,
  type RuntimeMode,
} from "@/lib/workflow/runtime";
import type {
  AuditEvent,
  ConversationMessage,
  ConversationPreview,
  InboxItem,
  RequestDetail,
  RequestPriority,
  RequestType,
  WorkflowTemplate,
  WorkflowStep,
} from "@/lib/workflow/types";

type DepartmentRow = {
  id: string;
  code: string;
  name: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
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

type RequestRow = {
  id: string;
  reference: string;
  requester_id: string;
  request_type_id: string;
  workflow_template_id: string | null;
  title: string;
  description: string;
  amount: number | null;
  currency: string;
  priority: RequestPriority;
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

type RequestStepInstanceRow = {
  id: string;
  request_id: string;
  template_step_id: string | null;
  step_order: number;
  name: string;
  kind: "approval" | "review" | "task" | "payment" | "notification";
  approver_id: string | null;
  status: "pending" | "approved" | "rejected" | "returned" | "skipped";
  assigned_at: string;
  acted_at: string | null;
  due_at: string | null;
  comment: string | null;
};

type RequestCommentRow = {
  id: string;
  request_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type RequestAttachmentRow = {
  id: string;
  request_id: string;
  uploader_id: string | null;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
};

type AuditLogRow = {
  id: number;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ConversationRow = {
  id: string;
  request_id: string | null;
  title: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CreationCatalog = {
  mode: RuntimeMode;
  actor: RuntimeActor;
  requestTypes: Array<
    Pick<RequestType, "id" | "name" | "description" | "department" | "averageSlaHours" | "accent"> & {
      code: string;
    }
  >;
  templates: Array<
    Pick<WorkflowTemplate, "id" | "name" | "summary" | "coverage" | "steps"> & {
      code: string;
      requestTypeId: string;
      requestTypeCode: string | null;
    }
  >;
};

type RequestDetailResult = {
  mode: RuntimeMode;
  actor: RuntimeActor;
  request: RequestDetail;
  history: AuditEvent[];
  conversation: ConversationPreview | null;
  messages: ConversationMessage[];
  canAct: boolean;
  currentApproverLabel: string | null;
};

type ApprovalInboxResult = {
  mode: RuntimeMode;
  actor: RuntimeActor;
  items: InboxItem[];
  history: AuditEvent[];
};

type CreateWorkflowRequestInput = {
  requestTypeCode: string;
  templateId?: string | null;
  title: string;
  description: string;
  amount?: number | null;
  priority: RequestPriority;
};

type CreateWorkflowRequestResult =
  | {
      mode: "live";
      actor: RuntimeActor;
      requestId: string;
      reference: string;
    }
  | {
      mode: "demo";
      actor: RuntimeActor;
      reference: string;
      note: string;
    };

type WorkflowDecision = "approve" | "reject" | "return";

type ApplyWorkflowDecisionInput = {
  requestReferenceOrId: string;
  decision: WorkflowDecision;
  comment: string;
};

type ApplyWorkflowDecisionResult =
  | {
      mode: "live";
      actor: RuntimeActor;
      reference: string;
      status: "in_review" | "needs_changes" | "approved" | "rejected";
    }
  | {
      mode: "demo";
      actor: RuntimeActor;
      status: "demo";
      note: string;
    };

const accentByDepartment: Record<string, RequestType["accent"]> = {
  Finance: "coral",
  Operations: "sand",
  IT: "teal",
  HR: "coral",
  Legal: "ink",
  Procurement: "ink",
};

export async function getWorkflowCreationCatalog(): Promise<CreationCatalog> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      requestTypes: mockRequestTypes.map((item) => ({
        ...item,
        code: item.id.replace("-request", ""),
      })),
      templates: mockWorkflowTemplates.map((item, index) => ({
        ...item,
        code: ["budget_standard", "payment_vendor", "repair_critical"][index] ?? item.id,
        requestTypeId: mockRequestTypes[index]?.id ?? mockRequestTypes[0].id,
        requestTypeCode:
          ["budget", "payment", "repair"][index] ?? mockRequestTypes[0].id,
      })),
    };
  }

  const service = createSupabaseServiceRoleClient();
  const [requestTypesResult, templatesResult, stepsResult, departmentsResult] =
    await Promise.all([
      service
        .from("request_types")
        .select("id, code, name, description, department_id, default_sla_hours")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      service
        .from("workflow_templates")
        .select("id, code, name, description, request_type_id, version, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      service
        .from("workflow_template_steps")
        .select(
          "id, template_id, step_order, name, kind, approver_mode, approver_user_id, approver_department_id, min_approvals, sla_hours, condition_json",
        )
        .order("step_order", { ascending: true }),
      service.from("departments").select("id, code, name"),
    ]);

  const departments = ((departmentsResult.data as DepartmentRow[] | null) ?? []).reduce<
    Record<string, DepartmentRow>
  >((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});

  const requestTypes = ((requestTypesResult.data as RequestTypeRow[] | null) ?? []).map(
    (item) => {
      const departmentName = item.department_id
        ? departments[item.department_id]?.name ?? "Operations"
        : "Operations";

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        department: mapDepartmentName(departmentName),
        averageSlaHours: item.default_sla_hours,
        accent: accentByDepartment[mapDepartmentName(departmentName)] ?? "teal",
      };
    },
  );

  const requestTypeById = requestTypes.reduce<Record<string, (typeof requestTypes)[number]>>(
    (accumulator, item) => {
      accumulator[item.id] = item;
      return accumulator;
    },
    {},
  );

  const stepsByTemplate = groupBy(
    (stepsResult.data as WorkflowTemplateStepRow[] | null) ?? [],
    (item) => item.template_id,
  );

  const templates = ((templatesResult.data as WorkflowTemplateRow[] | null) ?? []).map(
    (item) => ({
      id: item.id,
      code: item.code,
      requestTypeId: item.request_type_id ?? "",
      requestTypeCode: item.request_type_id
        ? requestTypeById[item.request_type_id]?.code ?? null
        : null,
      name: item.name,
      summary: `Version ${item.version} · ${item.description}`,
      coverage: item.description,
      steps: (stepsByTemplate[item.id] ?? []).map((step) =>
        mapTemplateStepToView(step, departments),
      ),
    }),
  );

  return {
    mode: "live",
    actor,
    requestTypes,
    templates,
  };
}

export async function getApprovalsInboxData(): Promise<ApprovalInboxResult> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      items: approvalInbox,
      history: auditTimeline,
    };
  }

  const service = createSupabaseServiceRoleClient();
  const { data: stepRows } = await service
    .from("request_step_instances")
    .select(
      "id, request_id, template_step_id, step_order, name, kind, approver_id, status, assigned_at, acted_at, due_at, comment",
    )
    .eq("approver_id", actor.id)
    .eq("status", "pending");

  const pendingSteps = (stepRows as RequestStepInstanceRow[] | null) ?? [];
  const requestIds = uniqueValues(pendingSteps.map((item) => item.request_id));

  if (requestIds.length === 0) {
    return {
      mode: "live",
      actor,
      items: [],
      history: [],
    };
  }

  const { data: requestRows } = await service
    .from("requests")
    .select("*")
    .in("id", requestIds);

  const requests = ((requestRows as RequestRow[] | null) ?? []).filter((request) =>
    pendingSteps.some(
      (step) =>
        step.request_id === request.id &&
        step.step_order === request.current_step_order &&
        step.approver_id === actor.id,
    ),
  );

  const requestTypeIds = uniqueValues(requests.map((item) => item.request_type_id));
  const requesterIds = uniqueValues(requests.map((item) => item.requester_id));
  const [requestTypesResult, profilesResult, departmentsResult, auditResult] =
    await Promise.all([
      service
        .from("request_types")
        .select("id, code, name, description, department_id, default_sla_hours")
        .in("id", requestTypeIds),
      service
        .from("profiles")
        .select("id, email, full_name, role, department_id, job_title")
        .in("id", requesterIds),
      service.from("departments").select("id, code, name"),
      service
        .from("audit_logs")
        .select("id, actor_id, entity_type, entity_id, action, payload, created_at")
        .eq("entity_type", "request")
        .in("entity_id", requestIds)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const requestTypeById = toMap(
    (requestTypesResult.data as RequestTypeRow[] | null) ?? [],
    (item) => item.id,
  );
  const profileById = toMap(
    (profilesResult.data as ProfileRow[] | null) ?? [],
    (item) => item.id,
  );
  const departmentById = toMap(
    (departmentsResult.data as DepartmentRow[] | null) ?? [],
    (item) => item.id,
  );

  const items: InboxItem[] = requests
    .sort((left, right) => {
      const leftDue = left.due_at ? new Date(left.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.due_at ? new Date(right.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    })
    .map((request) => {
      const requestType = requestTypeById[request.request_type_id];
      const requester = profileById[request.requester_id];
      const departmentName =
        requestType?.department_id && departmentById[requestType.department_id]
          ? departmentById[requestType.department_id].name
          : "Operations";
      const activeStep =
        pendingSteps.find(
          (step) =>
            step.request_id === request.id && step.step_order === request.current_step_order,
        ) ?? pendingSteps.find((step) => step.request_id === request.id);

      return {
        id: request.reference,
        title: request.title,
        typeName: requestType?.name ?? "Demande",
        requester: requester?.full_name ?? "Collaborateur",
        department: departmentName,
        amount: formatAmount(request.amount, request.currency),
        currentStep: activeStep?.name ?? "En attente",
        dueLabel: formatDueLabel(request.due_at, request.status),
        dueState: computeDueState(request.due_at, request.status),
        status: normalizeRequestStatus(request.status),
        priority: request.priority,
      };
    });

  return {
    mode: "live",
    actor,
    items,
    history: mapAuditRowsToView(
      (auditResult.data as AuditLogRow[] | null) ?? [],
      profileById,
    ),
  };
}

export async function getRequestDetailData(
  referenceOrId: string,
): Promise<RequestDetailResult | null> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    const request = getRequestDetail(referenceOrId);

    if (!request) {
      return null;
    }

    return {
      mode: "demo",
      actor,
      request,
      history: auditTimeline,
      conversation: getConversationPreview(request.conversationId) ?? null,
      messages: getConversationMessages(request.conversationId),
      canAct: false,
      currentApproverLabel: null,
    };
  }

  const service = createSupabaseServiceRoleClient();
  const requestRow = await findRequestByReferenceOrId(service, referenceOrId);

  if (!requestRow) {
    return null;
  }

  const [
    requestTypeResult,
    templateResult,
    requesterResult,
    assigneeResult,
    stepsResult,
    commentsResult,
    attachmentsResult,
    profilesResult,
    departmentsResult,
    auditResult,
    conversationResult,
  ] = await Promise.all([
    service
      .from("request_types")
      .select("id, code, name, description, department_id, default_sla_hours")
      .eq("id", requestRow.request_type_id)
      .maybeSingle(),
    requestRow.workflow_template_id
      ? service
          .from("workflow_templates")
          .select("id, code, name, description, request_type_id, version, is_active")
          .eq("id", requestRow.workflow_template_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    service
      .from("profiles")
      .select("id, email, full_name, role, department_id, job_title")
      .eq("id", requestRow.requester_id)
      .maybeSingle(),
    requestRow.current_assignee_id
      ? service
          .from("profiles")
          .select("id, email, full_name, role, department_id, job_title")
          .eq("id", requestRow.current_assignee_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    service
      .from("request_step_instances")
      .select(
        "id, request_id, template_step_id, step_order, name, kind, approver_id, status, assigned_at, acted_at, due_at, comment",
      )
      .eq("request_id", requestRow.id)
      .order("step_order", { ascending: true }),
    service
      .from("request_comments")
      .select("id, request_id, author_id, body, is_internal, created_at")
      .eq("request_id", requestRow.id)
      .order("created_at", { ascending: false }),
    service
      .from("request_attachments")
      .select("id, request_id, uploader_id, file_name, size_bytes, created_at")
      .eq("request_id", requestRow.id)
      .order("created_at", { ascending: false }),
    service
      .from("profiles")
      .select("id, email, full_name, role, department_id, job_title"),
    service.from("departments").select("id, code, name"),
    service
      .from("audit_logs")
      .select("id, actor_id, entity_type, entity_id, action, payload, created_at")
      .eq("entity_type", "request")
      .eq("entity_id", requestRow.id)
      .order("created_at", { ascending: false })
      .limit(10),
    service
      .from("conversations")
      .select("id, request_id, title")
      .eq("request_id", requestRow.id)
      .eq("type", "request")
      .maybeSingle(),
  ]);

  const requestType = (requestTypeResult.data as RequestTypeRow | null) ?? null;
  const template = (templateResult.data as WorkflowTemplateRow | null) ?? null;
  const requester = (requesterResult.data as ProfileRow | null) ?? null;
  const assignee = (assigneeResult.data as ProfileRow | null) ?? null;
  const allProfiles = toMap(
    (profilesResult.data as ProfileRow[] | null) ?? [],
    (item) => item.id,
  );
  const departments = toMap(
    (departmentsResult.data as DepartmentRow[] | null) ?? [],
    (item) => item.id,
  );
  const steps = (stepsResult.data as RequestStepInstanceRow[] | null) ?? [];
  const comments = (commentsResult.data as RequestCommentRow[] | null) ?? [];
  const attachments = (attachmentsResult.data as RequestAttachmentRow[] | null) ?? [];
  const conversation = (conversationResult.data as ConversationRow | null) ?? null;

  const conversationMessages = conversation
    ? await loadConversationMessages(service, conversation.id, actor.id)
    : [];
  const canAct = steps.some(
    (step) =>
      step.approver_id === actor.id &&
      step.status === "pending" &&
      step.step_order === requestRow.current_step_order,
  );
  const currentSteps = steps.filter(
    (step) => step.step_order === requestRow.current_step_order && step.status === "pending",
  );
  const currentApproverLabel = currentSteps
    .map((step) => (step.approver_id ? allProfiles[step.approver_id]?.full_name : null))
    .filter(Boolean)
    .join(" · ");
  const currentStepLabel =
    currentSteps.map((item) => item.name).join(" · ") ||
    steps.find((item) => item.step_order === requestRow.current_step_order)?.name ||
    "En attente";
  const requestDepartmentName =
    requestType?.department_id && departments[requestType.department_id]
      ? departments[requestType.department_id].name
      : requester?.department_id && departments[requester.department_id]
        ? departments[requester.department_id].name
        : "Operations";

  const participants = uniqueValues(
    [
      requester?.full_name ?? null,
      assignee?.full_name ?? null,
      ...steps.map((step) =>
        step.approver_id ? allProfiles[step.approver_id]?.full_name ?? null : null,
      ),
    ].filter((value): value is string => Boolean(value)),
  );

  const viewRequest: RequestDetail = {
    id: requestRow.id,
    reference: requestRow.reference,
    title: requestRow.title,
    typeName: requestType?.name ?? "Demande",
    requester: requester?.full_name ?? "Collaborateur",
    requesterRole: requester?.job_title ?? humanizeRole(requester?.role) ?? "Utilisateur interne",
    department: requestDepartmentName,
    amount: formatAmount(requestRow.amount, requestRow.currency),
    submittedAt: formatLongDateTime(requestRow.submitted_at ?? requestRow.created_at),
    dueLabel: formatDueLabel(requestRow.due_at, requestRow.status),
    dueState: computeDueState(requestRow.due_at, requestRow.status),
    priority: requestRow.priority,
    status: normalizeRequestStatus(requestRow.status),
    currentStep: currentStepLabel,
    description: requestRow.description,
    businessRule:
      template?.description ||
      "Le moteur applique le template sélectionné et pousse chaque approbateur avec historique complet.",
    templateName: template?.name ?? "Workflow interne",
    participants,
    steps: steps.map((step) => ({
      id: step.id,
      name: step.name,
      owner: step.approver_id ? allProfiles[step.approver_id]?.full_name ?? "À affecter" : "À affecter",
      status: mapStepStatusForView(step, requestRow.current_step_order),
      deadline: step.due_at ? formatClockOrDate(step.due_at) : "Sans SLA",
      note:
        step.comment ||
        (step.status === "approved"
          ? "Décision enregistrée."
          : step.status === "returned"
            ? "Retour demandé au demandeur."
            : step.status === "rejected"
              ? "Étape clôturée par rejet."
              : "Étape générée automatiquement par le moteur."),
    })),
    comments: comments.map((comment) => ({
      id: comment.id,
      author: comment.author_id ? allProfiles[comment.author_id]?.full_name ?? "Workflow Engine" : "Workflow Engine",
      role: comment.author_id
        ? allProfiles[comment.author_id]?.job_title ||
          humanizeRole(allProfiles[comment.author_id]?.role) ||
          "Collaborateur"
        : "Automatisation",
      body: comment.body,
      createdAt: formatUiTime(comment.created_at),
      kind: inferCommentKind(comment.body),
    })),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.file_name,
      size: formatBytes(attachment.size_bytes),
      uploadedBy: attachment.uploader_id
        ? allProfiles[attachment.uploader_id]?.full_name ?? "Collaborateur"
        : "Collaborateur",
      uploadedAt: formatClockOrDate(attachment.created_at),
    })),
    conversationId: conversation?.id ?? "",
  };

  const viewConversation: ConversationPreview | null = conversation
    ? {
        id: conversation.id,
        title: conversation.title ?? `${requestRow.reference} · Canal dossier`,
        context: `Canal lié à la demande ${requestRow.reference}`,
        participants,
        unreadCount: 0,
        lastMessage:
          conversationMessages[conversationMessages.length - 1]?.body ??
          "Aucun message pour le moment.",
        lastAt:
          conversationMessages[conversationMessages.length - 1]?.createdAt ?? "—",
        tone: "request",
      }
    : null;

  return {
    mode: "live",
    actor,
    request: viewRequest,
    history: mapAuditRowsToView(
      (auditResult.data as AuditLogRow[] | null) ?? [],
      allProfiles,
    ),
    conversation: viewConversation,
    messages: conversationMessages,
    canAct,
    currentApproverLabel: currentApproverLabel || null,
  };
}

export async function createWorkflowRequest(
  input: CreateWorkflowRequestInput,
): Promise<CreateWorkflowRequestResult> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      reference: `REQ-DEMO-${Date.now().toString().slice(-6)}`,
      note: "Mode démo: connecte Supabase Auth pour créer une vraie demande.",
    };
  }

  const service = createSupabaseServiceRoleClient();
  const [requestTypeResult, requesterResult, profilesResult] = await Promise.all([
      service
        .from("request_types")
        .select("id, code, name, description, department_id, default_sla_hours")
        .eq("code", input.requestTypeCode)
        .maybeSingle(),
      service
        .from("profiles")
        .select("id, email, full_name, role, department_id, job_title")
        .eq("id", actor.id)
        .maybeSingle(),
      service
        .from("profiles")
        .select("id, email, full_name, role, department_id, job_title"),
    ]);

  const requestType = (requestTypeResult.data as RequestTypeRow | null) ?? null;
  const requester = (requesterResult.data as ProfileRow | null) ?? null;

  if (!requestType || !requester) {
    throw new Error("Unable to resolve requester or request type.");
  }

  const { data: templateRows } = await service
    .from("workflow_templates")
    .select("id, code, name, description, request_type_id, version, is_active")
    .eq("request_type_id", requestType.id)
    .eq("is_active", true)
    .order("version", { ascending: false });

  const availableTemplates = (templateRows as WorkflowTemplateRow[] | null) ?? [];
  const selectedTemplate =
    availableTemplates.find((item) => item.id === input.templateId) ??
    availableTemplates[0] ??
    null;

  if (!selectedTemplate) {
    throw new Error("No active workflow template found for this request type.");
  }

  const { data: templateStepsData } = await service
    .from("workflow_template_steps")
    .select(
      "id, template_id, step_order, name, kind, approver_mode, approver_user_id, approver_department_id, min_approvals, sla_hours, condition_json",
    )
    .eq("template_id", selectedTemplate.id)
    .order("step_order", { ascending: true });

  const templateSteps = ((templateStepsData as WorkflowTemplateStepRow[] | null) ?? []).filter(
    (step) =>
      stepMatchesRequest(step.condition_json, {
        amount: input.amount ?? null,
        priority: input.priority,
        requestTypeCode: requestType.code,
        requesterDepartmentId: requester.department_id,
      }),
  );

  const allProfiles = (profilesResult.data as ProfileRow[] | null) ?? [];

  const { data: requestInsertData, error: requestInsertError } = await service
    .from("requests")
    .insert({
      requester_id: actor.id,
      request_type_id: requestType.id,
      workflow_template_id: selectedTemplate.id,
      title: input.title.trim(),
      description: input.description.trim(),
      amount: input.amount ?? null,
      currency: "EUR",
      priority: input.priority,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      metadata: {
        request_type_code: requestType.code,
      },
    })
    .select("*")
    .single();

  if (requestInsertError || !requestInsertData) {
    throw new Error("Unable to create workflow request.");
  }

  const request = requestInsertData as RequestRow;
  const now = Date.now();

  const instantiatedSteps = templateSteps.map((step) => {
    const approver = resolveApproverForStep({
      step,
      requester,
      requestType,
      profiles: allProfiles,
      amount: input.amount ?? null,
    });

    return {
      request_id: request.id,
      template_step_id: step.id,
      step_order: step.step_order,
      name: step.name,
      kind: step.kind,
      approver_id: approver?.id ?? null,
      status: "pending" as const,
      assigned_at: new Date().toISOString(),
      due_at: new Date(now + step.sla_hours * 60 * 60 * 1000).toISOString(),
      comment: `Généré depuis ${selectedTemplate.name}.`,
    };
  });

  if (instantiatedSteps.length > 0) {
    const { error: stepsInsertError } = await service
      .from("request_step_instances")
      .insert(instantiatedSteps);

    if (stepsInsertError) {
      throw new Error("Unable to instantiate workflow steps.");
    }
  }

  const firstStep = instantiatedSteps[0] ?? null;

  const { error: requestUpdateError } = await service
    .from("requests")
    .update({
      status: instantiatedSteps.length > 0 ? "in_review" : "approved",
      current_step_order: firstStep?.step_order ?? null,
      current_assignee_id: firstStep?.approver_id ?? null,
      due_at: firstStep?.due_at ?? null,
      decided_at: instantiatedSteps.length > 0 ? null : new Date().toISOString(),
    })
    .eq("id", request.id);

  if (requestUpdateError) {
    throw new Error("Unable to activate the first workflow step.");
  }

  await service.from("request_comments").insert({
    request_id: request.id,
    author_id: actor.id,
    body: `Demande soumise dans le workflow ${selectedTemplate.name}.`,
    is_internal: true,
  });

  await service.from("audit_logs").insert({
    actor_id: actor.id,
    entity_type: "request",
    entity_id: request.id,
    action: "request_created",
    payload: {
      reference: request.reference,
      template: selectedTemplate.code,
      request_type: requestType.code,
    },
  });

  const { data: conversationData } = await service
    .from("conversations")
    .select("id, request_id, title")
    .eq("request_id", request.id)
    .eq("type", "request")
    .maybeSingle();
  const conversation = (conversationData as ConversationRow | null) ?? null;
  const participantIds = uniqueValues([
    actor.id,
    ...instantiatedSteps.map((step) => step.approver_id).filter((value): value is string => Boolean(value)),
  ]);

  if (conversation && participantIds.length > 0) {
    await service.from("conversation_members").upsert(
      participantIds.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
      })),
      { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
    );

    await service.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: null,
      kind: "system",
      body: `Demande ${request.reference} soumise et routée vers ${firstStep?.name ?? "validation finale"}.`,
      metadata: {
        sender_name: "Workflow Engine",
      },
    });
  }

  if (firstStep?.approver_id) {
    const approver = allProfiles.find((profile) => profile.id === firstStep.approver_id);

    if (approver) {
      await dispatchNotifications({
        recipients: [
          {
            id: approver.id,
            email: approver.email,
            fullName: approver.full_name,
          },
        ],
        title: `Nouvelle validation · ${request.reference}`,
        body: `${request.title} attend ton action sur l'étape ${firstStep.name}.`,
        requestId: request.id,
        sendEmail: true,
        actionPath: `/requests/${request.reference}`,
        actionLabel: "Ouvrir le dossier",
      });
    }
  }

  return {
    mode: "live",
    actor,
    requestId: request.id,
    reference: request.reference,
  };
}

export async function applyWorkflowDecision(
  input: ApplyWorkflowDecisionInput,
): Promise<ApplyWorkflowDecisionResult> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      status: "demo",
      note: "Mode démo: connecte Supabase Auth pour enregistrer une vraie décision.",
    };
  }

  const service = createSupabaseServiceRoleClient();
  const request = await findRequestByReferenceOrId(service, input.requestReferenceOrId);

  if (!request) {
    throw new Error("Request not found.");
  }

  const { data: stepRows } = await service
    .from("request_step_instances")
    .select(
      "id, request_id, template_step_id, step_order, name, kind, approver_id, status, assigned_at, acted_at, due_at, comment",
    )
    .eq("request_id", request.id)
    .order("step_order", { ascending: true });

  const steps = (stepRows as RequestStepInstanceRow[] | null) ?? [];
  const currentStep = steps.find(
    (step) =>
      step.step_order === request.current_step_order &&
      step.approver_id === actor.id &&
      step.status === "pending",
  );

  if (!currentStep) {
    throw new Error("Current actor is not allowed to decide on this request.");
  }

  const decisionStatusMap: Record<WorkflowDecision, RequestStepInstanceRow["status"]> = {
    approve: "approved",
    reject: "rejected",
    return: "returned",
  };

  await service
    .from("request_step_instances")
    .update({
      status: decisionStatusMap[input.decision],
      acted_at: new Date().toISOString(),
      comment: input.comment.trim() || null,
    })
    .eq("id", currentStep.id);

  if (input.comment.trim()) {
    await service.from("request_comments").insert({
      request_id: request.id,
      author_id: actor.id,
      body: input.comment.trim(),
      is_internal: true,
    });
  }

  const [profilesResult, conversationResult] = await Promise.all([
    service.from("profiles").select("id, email, full_name, role, department_id, job_title"),
    service
      .from("conversations")
      .select("id, request_id, title")
      .eq("request_id", request.id)
      .eq("type", "request")
      .maybeSingle(),
  ]);
  const profiles = (profilesResult.data as ProfileRow[] | null) ?? [];
  const requester = profiles.find((profile) => profile.id === request.requester_id) ?? null;
  const conversation = (conversationResult.data as ConversationRow | null) ?? null;

  if (input.decision === "approve") {
    const nextStep = steps.find(
      (step) =>
        step.step_order > currentStep.step_order &&
        step.status === "pending",
    );

    if (nextStep) {
      await service
        .from("requests")
        .update({
          status: "in_review",
          current_step_order: nextStep.step_order,
          current_assignee_id: nextStep.approver_id,
          due_at: nextStep.due_at,
        })
        .eq("id", request.id);

      await service.from("audit_logs").insert({
        actor_id: actor.id,
        entity_type: "request",
        entity_id: request.id,
        action: "step_approved",
        payload: {
          step: currentStep.name,
          next_step: nextStep.name,
        },
      });

      if (conversation && nextStep.approver_id) {
        await service.from("conversation_members").upsert(
          {
            conversation_id: conversation.id,
            user_id: nextStep.approver_id,
          },
          { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
        );

        await service.from("messages").insert({
          conversation_id: conversation.id,
          sender_id: null,
          kind: "system",
          body: `${actor.fullName} a approuvé ${currentStep.name}. Le dossier passe à ${nextStep.name}.`,
          metadata: {
            sender_name: "Workflow Engine",
          },
        });
      }

      const nextApprover = nextStep.approver_id
        ? profiles.find((profile) => profile.id === nextStep.approver_id) ?? null
        : null;

      if (nextApprover) {
        await dispatchNotifications({
          recipients: [
            {
              id: nextApprover.id,
              email: nextApprover.email,
              fullName: nextApprover.full_name,
            },
          ],
          title: `Validation requise · ${request.reference}`,
          body: `${request.title} vient d’entrer dans l’étape ${nextStep.name}.`,
          requestId: request.id,
          sendEmail: true,
          actionPath: `/requests/${request.reference}`,
          actionLabel: "Traiter la demande",
        });
      }

      return {
        mode: "live",
        actor,
        reference: request.reference,
        status: "in_review",
      };
    }

    await service
      .from("requests")
      .update({
        status: "approved",
        current_step_order: null,
        current_assignee_id: null,
        due_at: null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    await service.from("audit_logs").insert({
      actor_id: actor.id,
      entity_type: "request",
      entity_id: request.id,
      action: "request_approved",
      payload: {
        step: currentStep.name,
      },
    });

    if (conversation) {
      await service.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: null,
        kind: "system",
        body: `${actor.fullName} a approuvé la demande ${request.reference}. Workflow terminé.`,
        metadata: {
          sender_name: "Workflow Engine",
        },
      });
    }

    if (requester) {
      await dispatchNotifications({
        recipients: [
          {
            id: requester.id,
            email: requester.email,
            fullName: requester.full_name,
          },
        ],
        title: `Demande approuvée · ${request.reference}`,
        body: `${request.title} a été approuvée et le workflow est terminé.`,
        requestId: request.id,
        sendEmail: true,
        actionPath: `/requests/${request.reference}`,
      });
    }

    return {
      mode: "live",
      actor,
      reference: request.reference,
      status: "approved",
    };
  }

  const requestStatus = input.decision === "reject" ? "rejected" : "needs_changes";

  await service
    .from("request_step_instances")
    .update({
      status: "skipped",
    })
    .eq("request_id", request.id)
    .eq("status", "pending")
    .gt("step_order", currentStep.step_order);

  await service
    .from("requests")
    .update({
      status: requestStatus,
      current_step_order: null,
      current_assignee_id: null,
      due_at: null,
      decided_at: input.decision === "reject" ? new Date().toISOString() : null,
    })
    .eq("id", request.id);

  await service.from("audit_logs").insert({
    actor_id: actor.id,
    entity_type: "request",
    entity_id: request.id,
    action: input.decision === "reject" ? "request_rejected" : "request_returned",
    payload: {
      step: currentStep.name,
      comment: input.comment.trim(),
    },
  });

  if (conversation) {
    await service.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: null,
      kind: "system",
      body:
        input.decision === "reject"
          ? `${actor.fullName} a rejeté la demande ${request.reference}.`
          : `${actor.fullName} a renvoyé la demande ${request.reference} pour correction.`,
      metadata: {
        sender_name: "Workflow Engine",
      },
    });
  }

  if (requester) {
    await dispatchNotifications({
      recipients: [
        {
          id: requester.id,
          email: requester.email,
          fullName: requester.full_name,
        },
      ],
      title:
        input.decision === "reject"
          ? `Demande rejetée · ${request.reference}`
          : `Corrections demandées · ${request.reference}`,
      body:
        input.decision === "reject"
          ? `${request.title} a été rejetée à l’étape ${currentStep.name}.`
          : `${request.title} attend tes corrections après l’étape ${currentStep.name}.`,
      requestId: request.id,
      sendEmail: true,
      actionPath: `/requests/${request.reference}`,
    });
  }

  return {
    mode: "live",
    actor,
    reference: request.reference,
    status: requestStatus,
  };
}

function mapTemplateStepToView(
  step: WorkflowTemplateStepRow,
  departments: Record<string, DepartmentRow>,
): WorkflowStep {
  return {
    id: step.id,
    name: step.name,
    type: step.kind,
    assigneeLabel: describeApproverMode(step, departments),
    rule: describeCondition(step.condition_json),
    slaHours: step.sla_hours,
  };
}

function mapAuditRowsToView(
  rows: AuditLogRow[],
  profiles: Record<string, ProfileRow>,
): AuditEvent[] {
  return rows.map((row) => ({
    id: String(row.id),
    actor: row.actor_id ? profiles[row.actor_id]?.full_name ?? "Workflow Engine" : "Workflow Engine",
    action: humanizeAuditAction(row.action),
    at: formatUiTime(row.created_at),
    detail: buildAuditDetail(row),
  }));
}

async function loadConversationMessages(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  conversationId: string,
  actorId: string,
) {
  const { data } = await service
    .from("messages")
    .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(12);

  return ((data as MessageRow[] | null) ?? []).map((item) =>
    mapMessageRowToView(item, actorId),
  );
}

function mapStepStatusForView(
  step: RequestStepInstanceRow,
  currentStepOrder: number | null,
): RequestDetail["steps"][number]["status"] {
  if (step.status === "approved") {
    return "approved";
  }

  if (step.status === "returned") {
    return "returned";
  }

  if (step.status === "rejected") {
    return "rejected";
  }

  if (step.status === "skipped") {
    return "skipped";
  }

  return step.step_order === currentStepOrder ? "active" : "pending";
}

function resolveApproverForStep(args: {
  step: WorkflowTemplateStepRow;
  requester: ProfileRow;
  requestType: RequestTypeRow;
  profiles: ProfileRow[];
  amount: number | null;
}) {
  const explicitUser = args.step.approver_user_id
    ? args.profiles.find((profile) => profile.id === args.step.approver_user_id) ?? null
    : null;

  if (explicitUser) {
    return explicitUser;
  }

  const targetDepartmentId =
    args.step.approver_department_id ||
    args.requestType.department_id ||
    args.requester.department_id ||
    null;

  const departmentManagers = args.profiles.filter(
    (profile) =>
      profile.department_id === targetDepartmentId &&
      (profile.role === "manager" || profile.role === "admin") &&
      profile.id !== args.requester.id,
  );
  const allManagers = args.profiles.filter(
    (profile) =>
      (profile.role === "manager" || profile.role === "admin") &&
      profile.id !== args.requester.id,
  );

  switch (args.step.approver_mode) {
    case "manager":
      return departmentManagers[0] ?? allManagers[0] ?? args.requester;
    case "department_role":
      return departmentManagers[0] ?? allManagers[0] ?? args.requester;
    case "dynamic":
      if ((args.amount ?? 0) >= 10_000) {
        return (
          departmentManagers.find((profile) => profile.role === "admin") ??
          allManagers.find((profile) => profile.role === "admin") ??
          departmentManagers[0] ??
          allManagers[0] ??
          args.requester
        );
      }

      return departmentManagers[0] ?? allManagers[0] ?? args.requester;
    default:
      return args.requester;
  }
}

function stepMatchesRequest(
  rawCondition: Record<string, unknown> | null,
  context: {
    amount: number | null;
    priority: RequestPriority;
    requestTypeCode: string;
    requesterDepartmentId: string | null;
  },
) {
  const condition = isRecord(rawCondition) ? rawCondition : {};

  if (typeof condition.minAmount === "number" && (context.amount ?? 0) < condition.minAmount) {
    return false;
  }

  if (typeof condition.maxAmount === "number" && (context.amount ?? 0) > condition.maxAmount) {
    return false;
  }

  if (
    Array.isArray(condition.priorities) &&
    condition.priorities.every((item) => typeof item === "string") &&
    !condition.priorities.includes(context.priority)
  ) {
    return false;
  }

  if (
    Array.isArray(condition.requestTypeCodes) &&
    condition.requestTypeCodes.every((item) => typeof item === "string") &&
    !condition.requestTypeCodes.includes(context.requestTypeCode)
  ) {
    return false;
  }

  return true;
}

async function findRequestByReferenceOrId(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  referenceOrId: string,
) {
  const query = service.from("requests").select("*");
  const { data } = isUuid(referenceOrId)
    ? await query.eq("id", referenceOrId).maybeSingle()
    : await query.eq("reference", referenceOrId).maybeSingle();

  return (data as RequestRow | null) ?? null;
}

function normalizeRequestStatus(
  status: RequestRow["status"],
): RequestDetail["status"] {
  if (status === "cancelled") {
    return "rejected";
  }

  return status;
}

function computeDueState(
  dueAt: string | null,
  status: RequestRow["status"],
): RequestDetail["dueState"] {
  if (!dueAt || status === "approved" || status === "rejected" || status === "needs_changes") {
    return "on_track";
  }

  const dueDate = new Date(dueAt).getTime();
  const delta = dueDate - Date.now();

  if (delta <= 0) {
    return "overdue";
  }

  if (delta <= 2 * 60 * 60 * 1000) {
    return "soon";
  }

  return "on_track";
}

function formatDueLabel(dueAt: string | null, status: RequestRow["status"]) {
  if (status === "needs_changes") {
    return "En attente demandeur";
  }

  if (!dueAt) {
    return "Sans échéance";
  }

  const dueDate = new Date(dueAt);
  const delta = dueDate.getTime() - Date.now();

  if (delta <= 0) {
    const overdueHours = Math.max(1, Math.round(Math.abs(delta) / (60 * 60 * 1000)));
    return `En retard ${overdueHours} h`;
  }

  if (delta <= 2 * 60 * 60 * 1000) {
    const remainingHours = Math.max(1, Math.round(delta / (60 * 60 * 1000)));
    return `Dans ${remainingHours} h`;
  }

  return formatClockOrDate(dueAt);
}

function formatClockOrDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const isToday = new Intl.DateTimeFormat("fr-CA").format(date) === new Intl.DateTimeFormat("fr-CA").format(new Date());

  if (isToday) {
    return `Aujourd'hui ${formatUiTime(value)}`;
  }

  return formatLongDateTime(value);
}

function formatLongDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(",", " ·");
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null || Number.isNaN(amount)) {
    return null;
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function describeApproverMode(
  step: WorkflowTemplateStepRow,
  departments: Record<string, DepartmentRow>,
) {
  if (step.approver_user_id) {
    return "Utilisateur ciblé";
  }

  if (step.approver_department_id && departments[step.approver_department_id]) {
    return `${departments[step.approver_department_id].name} · ${humanizeApproverMode(step.approver_mode)}`;
  }

  return humanizeApproverMode(step.approver_mode);
}

function humanizeApproverMode(mode: WorkflowTemplateStepRow["approver_mode"]) {
  if (mode === "manager") {
    return "Manager";
  }

  if (mode === "department_role") {
    return "Rôle départemental";
  }

  if (mode === "dynamic") {
    return "Règle dynamique";
  }

  return "Utilisateur";
}

function describeCondition(value: Record<string, unknown> | null) {
  const condition = isRecord(value) ? value : {};

  if (!Object.keys(condition).length) {
    return "Toujours";
  }

  const parts: string[] = [];

  if (typeof condition.minAmount === "number") {
    parts.push(`Montant >= ${condition.minAmount}`);
  }

  if (typeof condition.maxAmount === "number") {
    parts.push(`Montant <= ${condition.maxAmount}`);
  }

  if (
    Array.isArray(condition.priorities) &&
    condition.priorities.every((item) => typeof item === "string")
  ) {
    parts.push(`Priorités: ${condition.priorities.join(", ")}`);
  }

  return parts.join(" · ") || "Toujours";
}

function humanizeAuditAction(action: string) {
  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function buildAuditDetail(row: AuditLogRow) {
  const payload = isRecord(row.payload) ? row.payload : {};
  const pieces: string[] = [];

  if (typeof payload.reference === "string") {
    pieces.push(payload.reference);
  }

  if (typeof payload.step === "string") {
    pieces.push(`Étape ${payload.step}`);
  }

  if (typeof payload.next_step === "string") {
    pieces.push(`passe à ${payload.next_step}`);
  }

  if (typeof payload.comment === "string" && payload.comment.length > 0) {
    pieces.push(payload.comment);
  }

  return pieces.join(" · ") || "Événement workflow journalisé.";
}

function inferCommentKind(body: string): RequestDetail["comments"][number]["kind"] {
  const normalized = body.toLowerCase();

  if (
    normalized.includes("approuv") ||
    normalized.includes("rejet") ||
    normalized.includes("correction")
  ) {
    return "decision";
  }

  if (normalized.includes("workflow") || normalized.includes("moteur")) {
    return "system";
  }

  return "comment";
}

function mapDepartmentName(name: string): RequestType["department"] {
  if (
    name === "Finance" ||
    name === "Operations" ||
    name === "IT" ||
    name === "HR" ||
    name === "Legal" ||
    name === "Procurement"
  ) {
    return name;
  }

  return "Operations";
}

function humanizeRole(role: ProfileRow["role"] | undefined | null) {
  if (!role) {
    return null;
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "manager") {
    return "Manager";
  }

  return "Employé";
}

function formatBytes(size: number | null) {
  if (!size || size <= 0) {
    return "n/a";
  }

  if (size < 1024) {
    return `${size} o`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} Ko`;
  }

  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function groupBy<T>(
  items: T[],
  getKey: (item: T) => string,
) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = [...(accumulator[key] ?? []), item];
    return accumulator;
  }, {});
}

function toMap<T>(
  items: T[],
  getKey: (item: T) => string,
) {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[getKey(item)] = item;
    return accumulator;
  }, {});
}

function uniqueValues<T>(items: T[]) {
  return [...new Set(items)];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
