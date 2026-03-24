import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";
import { actorCanAccessRequest, findRequestByReferenceOrId } from "@/lib/workflow/request-access";

export const dynamic = "force-dynamic";

type AttachmentStorageRow = {
  id: string;
  request_id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const actor = await resolveRuntimeActor();

  if (actor.mode !== "live") {
    return NextResponse.json(
      { error: "Live authentication is required to open attachments." },
      { status: 401 },
    );
  }

  const { id, attachmentId } = await context.params;
  const service = createSupabaseServiceRoleClient();
  const workflowRequest = await findRequestByReferenceOrId(service, id);

  if (!workflowRequest) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (!(await actorCanAccessRequest(service, actor, workflowRequest))) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { data, error } = await service
    .from("request_attachments")
    .select("id, request_id, bucket, storage_path, file_name")
    .eq("id", attachmentId)
    .eq("request_id", workflowRequest.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const attachment = data as AttachmentStorageRow;
  const { data: signed, error: signedError } = await service.storage
    .from(attachment.bucket)
    .createSignedUrl(attachment.storage_path, 60, {
      download: attachment.file_name,
    });

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "Unable to create signed URL." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
