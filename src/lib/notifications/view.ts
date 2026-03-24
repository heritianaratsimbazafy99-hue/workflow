import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/lib/workflow/types";

export type NotificationViewRow = {
  id: string;
  user_id: string;
  request_id: string | null;
  channel: "in_app" | "email";
  category: "general" | "approval" | "message" | "mention" | "sla" | "system" | "digest";
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type RequestReferenceRow = {
  id: string;
  reference: string;
};

export async function mapNotificationRowsToItems(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  rows: NotificationViewRow[],
) {
  const requestIds = uniqueValues(
    rows.map((row) => row.request_id).filter((value): value is string => Boolean(value)),
  );
  const { data: requestRows } =
    requestIds.length > 0
      ? await service.from("requests").select("id, reference").in("id", requestIds)
      : { data: [] };
  const requestById = ((requestRows as RequestReferenceRow[] | null) ?? []).reduce<
    Record<string, string>
  >((accumulator, row) => {
    accumulator[row.id] = row.reference;
    return accumulator;
  }, {});

  return rows.map((row) => mapNotificationRowToItem(row, requestById[row.request_id ?? ""]));
}

function mapNotificationRowToItem(
  row: NotificationViewRow,
  requestReference: string | undefined,
): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    createdAt: formatUiTime(row.created_at),
    isRead: Boolean(row.read_at),
    channel: row.channel,
    category: row.category,
    requestReference: requestReference ?? row.request_id,
  };
}

function formatUiTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function uniqueValues<T>(items: T[]) {
  return Array.from(new Set(items));
}
