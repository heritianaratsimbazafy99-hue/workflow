"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Paperclip, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadRequestAttachments } from "@/lib/workflow/attachments-client";
import type { RequestAttachment } from "@/lib/workflow/types";

export function RequestAttachmentsPanel({
  requestReference,
  initialAttachments,
  canUpload,
}: {
  requestReference: string;
  initialAttachments: RequestAttachment[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const [attachments, setAttachments] = useState(initialAttachments);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalSizeLabel = useMemo(() => {
    const size = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    if (size === 0) {
      return null;
    }

    if (size < 1024) {
      return `${size} o`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }, [selectedFiles]);

  function handleUpload() {
    if (!canUpload || selectedFiles.length === 0) {
      return;
    }

    setFeedback(null);

    startTransition(() => {
      void (async () => {
        try {
          const uploaded = await uploadRequestAttachments(requestReference, selectedFiles);
          if (uploaded.length > 0) {
            setAttachments((current) => [...uploaded, ...current]);
          }
          setSelectedFiles([]);
          setFeedback(
            uploaded.length > 0
              ? `${uploaded.length} pièce(s) jointe(s) ajoutée(s).`
              : "Aucun fichier transféré.",
          );
          router.refresh();
        } catch (error) {
          setFeedback(
            error instanceof Error
              ? error.message
              : "Impossible de transférer les pièces jointes.",
          );
        }
      })();
    });
  }

  return (
    <div className="space-y-4">
      {canUpload ? (
        <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <label className="block text-sm font-medium text-[color:var(--foreground)]">
            Ajouter des fichiers
          </label>
          <input
            type="file"
            multiple
            onChange={(event) =>
              setSelectedFiles(Array.from(event.currentTarget.files ?? []))
            }
            className="mt-3 block w-full text-sm text-[color:var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--foreground)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[color:var(--surface-strong)]"
          />
          {selectedFiles.length > 0 ? (
            <div className="mt-3 rounded-[18px] border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--foreground)]">
              {selectedFiles.length} fichier(s) prêt(s) {totalSizeLabel ? `· ${totalSizeLabel}` : ""}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {isPending ? "Transfert..." : "Téléverser"}
          </button>
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      <div className="space-y-3">
        {attachments.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-4 text-sm leading-6 text-[color:var(--muted)]">
            Aucune pièce jointe pour le moment.
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-[color:var(--muted)]" />
                    <p className="truncate font-medium text-[color:var(--foreground)]">
                      {attachment.name}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {attachment.size} · Ajouté par {attachment.uploadedBy} · {attachment.uploadedAt}
                  </p>
                  {attachment.mimeType ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {attachment.mimeType}
                    </p>
                  ) : null}
                </div>
                {attachment.downloadPath ? (
                  <a
                    href={attachment.downloadPath}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)]"
                  >
                    <Download className="h-4 w-4" />
                    Ouvrir
                  </a>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
