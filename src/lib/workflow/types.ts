import { z } from "zod";

export const requestStatusSchema = z.enum([
  "draft",
  "submitted",
  "in_review",
  "needs_changes",
  "approved",
  "rejected",
  "completed",
]);

export const requestPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);

export const dueStateSchema = z.enum(["on_track", "soon", "overdue"]);

export const workflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["approval", "review", "task", "payment", "notification"]),
  assigneeLabel: z.string(),
  rule: z.string(),
  slaHours: z.number().int().positive(),
});

export const requestTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.enum([
    "Finance",
    "Operations",
    "IT",
    "HR",
    "Legal",
    "Procurement",
  ]),
  description: z.string(),
  averageSlaHours: z.number().int().positive(),
  accent: z.enum(["teal", "sand", "coral", "ink"]),
});

export const workflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  coverage: z.string(),
  steps: z.array(workflowStepSchema).min(1),
});

export const dashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.string(),
  tone: z.enum(["good", "warning", "neutral"]),
});

export const inboxItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  typeName: z.string(),
  requester: z.string(),
  department: z.string(),
  amount: z.string().nullable(),
  currentStep: z.string(),
  dueLabel: z.string(),
  dueState: dueStateSchema,
  status: requestStatusSchema,
  priority: requestPrioritySchema,
});

export const auditEventSchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.string(),
  at: z.string(),
  detail: z.string(),
});

export const automationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: z.string(),
  action: z.string(),
  status: z.enum(["active", "draft"]),
});

export const currentUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  roleLabel: z.string(),
  username: z.string().nullable().default(null),
  appRole: z.enum(["admin", "manager", "employee"]).default("employee"),
});

export const notificationItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
  channel: z.enum(["in_app", "email"]),
  category: z.enum(["general", "approval", "message", "mention", "sla", "system", "digest"]),
  requestReference: z.string().nullable(),
});

export const notificationPreferenceSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  approvalsInApp: z.boolean(),
  approvalsEmail: z.boolean(),
  messagesInApp: z.boolean(),
  messagesEmail: z.boolean(),
  mentionsInApp: z.boolean(),
  mentionsEmail: z.boolean(),
  slaInApp: z.boolean(),
  slaEmail: z.boolean(),
  digestEnabled: z.boolean(),
  digestFrequency: z.enum(["daily", "weekly"]),
});

export const workspaceAlertSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  tone: z.enum(["good", "warning", "critical"]),
});

export const requestStepInstanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  status: z.enum([
    "pending",
    "active",
    "approved",
    "returned",
    "rejected",
    "skipped",
    "escalated",
  ]),
  deadline: z.string(),
  note: z.string(),
});

export const requestCommentSchema = z.object({
  id: z.string(),
  author: z.string(),
  role: z.string(),
  body: z.string(),
  createdAt: z.string(),
  kind: z.enum(["comment", "decision", "system"]),
});

export const requestAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  mimeType: z.string().nullable().default(null),
  downloadPath: z.string().nullable().default(null),
});

export const requestSlaEventSchema = z.object({
  id: z.string(),
  kind: z.enum(["reminder", "escalation"]),
  recipient: z.string(),
  createdAt: z.string(),
  detail: z.string(),
});

export const conversationMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  author: z.string(),
  body: z.string(),
  createdAt: z.string(),
  kind: z.enum(["text", "system"]),
  isOwn: z.boolean(),
  mentionLabels: z.array(z.string()).default([]),
  readCount: z.number().int().nonnegative().default(0),
});

export const conversationPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string(),
  participants: z.array(z.string()),
  unreadCount: z.number().int().nonnegative(),
  lastMessage: z.string(),
  lastAt: z.string(),
  tone: z.enum(["request", "direct", "ops"]),
});

export const requestDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  title: z.string(),
  typeName: z.string(),
  requester: z.string(),
  requesterFullName: z.string().nullable().default(null),
  requesterHandle: z.string().nullable().default(null),
  requesterRole: z.string(),
  department: z.string(),
  amount: z.string().nullable(),
  submittedAt: z.string(),
  dueLabel: z.string(),
  dueState: dueStateSchema,
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  currentStep: z.string(),
  description: z.string(),
  businessRule: z.string(),
  templateName: z.string(),
  participants: z.array(z.string()),
  steps: z.array(requestStepInstanceSchema),
  comments: z.array(requestCommentSchema),
  attachments: z.array(requestAttachmentSchema),
  slaEvents: z.array(requestSlaEventSchema).default([]),
  customFields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        value: z.string(),
        section: z.string(),
      }),
    )
    .default([]),
  conversationId: z.string(),
});

export const formFieldSchema = z.object({
  id: z.string().default(""),
  key: z.string().default("field"),
  label: z.string(),
  type: z.enum([
    "text",
    "textarea",
    "select",
    "currency",
    "date",
    "file",
    "checkbox",
  ]),
  helper: z.string(),
  required: z.boolean(),
  placeholder: z.string().nullable().default(null),
  options: z.array(z.string()).default([]),
  width: z.enum(["full", "half"]).default("full"),
});

export const formSectionSchema = z.object({
  key: z.string().default("general"),
  title: z.string(),
  description: z.string(),
  fields: z.array(formFieldSchema).min(1),
});

export const cronRunResultSchema = z.object({
  status: z.literal("ok"),
  source: z.enum(["mock", "configured"]),
  scannedRequests: z.number().int().nonnegative(),
  remindersQueued: z.number().int().nonnegative(),
  escalationsQueued: z.number().int().nonnegative(),
  emailsQueued: z.number().int().nonnegative(),
  auditLogsInserted: z.number().int().nonnegative().default(0),
  timestamp: z.string().datetime(),
});

export const reportMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: z.enum(["good", "warning", "neutral"]),
});

export const reportBreakdownSchema = z.object({
  label: z.string(),
  value: z.number().int().nonnegative(),
});

export const reportApproverLoadSchema = z.object({
  approver: z.string(),
  pendingCount: z.number().int().nonnegative(),
  overdueCount: z.number().int().nonnegative(),
});

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type RequestPriority = z.infer<typeof requestPrioritySchema>;
export type DueState = z.infer<typeof dueStateSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type RequestType = z.infer<typeof requestTypeSchema>;
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;
export type InboxItem = z.infer<typeof inboxItemSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AutomationRule = z.infer<typeof automationRuleSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type NotificationItem = z.infer<typeof notificationItemSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type WorkspaceAlert = z.infer<typeof workspaceAlertSchema>;
export type RequestStepInstance = z.infer<typeof requestStepInstanceSchema>;
export type RequestComment = z.infer<typeof requestCommentSchema>;
export type RequestAttachment = z.infer<typeof requestAttachmentSchema>;
export type RequestSlaEvent = z.infer<typeof requestSlaEventSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationPreview = z.infer<typeof conversationPreviewSchema>;
export type RequestDetail = z.infer<typeof requestDetailSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormSection = z.infer<typeof formSectionSchema>;
export type CronRunResult = z.infer<typeof cronRunResultSchema>;
export type ReportMetric = z.infer<typeof reportMetricSchema>;
export type ReportBreakdown = z.infer<typeof reportBreakdownSchema>;
export type ReportApproverLoad = z.infer<typeof reportApproverLoadSchema>;
