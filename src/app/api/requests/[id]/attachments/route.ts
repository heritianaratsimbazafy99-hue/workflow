import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";
import { actorCanAccessRequest, findRequestByReferenceOrId } from "@/lib/workflow/request-access";

export const dynamic = "force-dynamic";

const REQUEST_FILES_BUCKET = "request-files";
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 6;

type AttachmentRow = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await resolveRuntimeActor();

  if (actor.mode !== "live") {
    return NextResponse.json(
      { error: "Live authentication is required to upload attachments." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const service = createSupabaseServiceRoleClient();
  const workflowRequest = await findRequestByReferenceOrId(service, id);

  if (!workflowRequest) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (!(await actorCanAccessRequest(service, actor, workflowRequest))) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES_PER_UPLOAD} fichiers par transfert.` },
      { status: 400 },
    );
  }

  const uploadedRows: AttachmentRow[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} dépasse la limite de 15 MB.` },
        { status: 400 },
      );
    }

    const fileName = sanitizeFileName(file.name);
    const storagePath = `requests/${workflowRequest.id}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await service.storage
      .from(REQUEST_FILES_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await service
      .from("request_attachments")
      .insert({
        request_id: workflowRequest.id,
        uploader_id: actor.id,
        bucket: REQUEST_FILES_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      .select("id, file_name, mime_type, size_bytes, created_at")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Unable to register attachment." },
        { status: 500 },
      );
    }

    uploadedRows.push(inserted as AttachmentRow);
  }

  await service.from("audit_logs").insert({
    actor_id: actor.id,
    entity_type: "request",
    entity_id: workflowRequest.id,
    action: "request_attachments_uploaded",
    payload: {
      files: uploadedRows.map((row) => row.file_name),
      count: uploadedRows.length,
    },
  });

  const { data: conversationData } = await service
    .from("conversations")
    .select("id")
    .eq("request_id", workflowRequest.id)
    .eq("type", "request")
    .maybeSingle();

  if (conversationData?.id) {
    await service.from("messages").insert({
      conversation_id: conversationData.id,
      sender_id: null,
      kind: "system",
      body:
        uploadedRows.length === 1
          ? `Pièce jointe ajoutée: ${uploadedRows[0]?.file_name}.`
          : `${uploadedRows.length} pièces jointes ajoutées au dossier.`,
      metadata: {
        sender_name: "Workflow Engine",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    attachments: uploadedRows.map((attachment) => ({
      id: attachment.id,
      name: attachment.file_name,
      size: formatBytes(attachment.size_bytes),
      uploadedBy: actor.fullName,
      uploadedAt: formatAttachmentTime(attachment.created_at),
      mimeType: attachment.mime_type,
      downloadPath: `/api/requests/${workflowRequest.reference}/attachments/${attachment.id}`,
    })),
  });
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function formatBytes(value: number | null) {
  if (!value || value <= 0) {
    return "Taille inconnue";
  }

  if (value < 1024) {
    return `${value} o`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
