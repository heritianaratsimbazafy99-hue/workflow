import { hasPublicSupabaseEnv } from "@/lib/supabase/config";
import { approvalInbox } from "@/lib/workflow/mock-data";
import { cronRunResultSchema } from "@/lib/workflow/types";

export async function processWorkflowReminders() {
  const scannedRequests = approvalInbox.length;
  const remindersQueued = approvalInbox.filter(
    (item) => item.dueState === "soon" || item.status === "needs_changes",
  ).length;
  const escalationsQueued = approvalInbox.filter(
    (item) => item.dueState === "overdue" || item.priority === "critical",
  ).length;
  const emailsQueued = Math.max(remindersQueued - 1, 1);

  return cronRunResultSchema.parse({
    status: "ok",
    source: hasPublicSupabaseEnv() ? "configured" : "mock",
    scannedRequests,
    remindersQueued,
    escalationsQueued,
    emailsQueued,
    timestamp: new Date().toISOString(),
  });
}
