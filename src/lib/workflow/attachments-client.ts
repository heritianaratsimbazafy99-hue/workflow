import type { RequestAttachment } from "@/lib/workflow/types";

export async function uploadRequestAttachments(
  requestReference: string,
  files: File[],
) {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(
    `/api/requests/${encodeURIComponent(requestReference)}/attachments`,
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    attachments?: RequestAttachment[];
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Impossible de transférer les pièces jointes.");
  }

  return payload.attachments ?? [];
}
