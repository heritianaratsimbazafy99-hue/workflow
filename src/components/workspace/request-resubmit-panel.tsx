"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal } from "lucide-react";

export function RequestResubmitPanel({
  requestReference,
  canResubmit,
}: {
  requestReference: string;
  canResubmit: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResubmit() {
    setFeedback(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/requests/${requestReference}/resubmit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              comment,
            }),
          });
          const data = (await response.json()) as {
            error?: string;
          };

          if (!response.ok) {
            setFeedback(data.error ?? "Impossible de resoumettre cette demande.");
            return;
          }

          setComment("");
          setFeedback("Demande resoumise dans le workflow.");
          router.refresh();
        } catch {
          setFeedback("Erreur réseau pendant la resoumission.");
        }
      })();
    });
  }

  return (
    <div className="rounded-[28px] border border-[color:var(--line)] bg-white/80 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
        Corrections demandeur
      </p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
        Resoumettre après corrections
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
        {canResubmit
          ? "Le dossier a été renvoyé pour correction. Tu peux ajouter un mot de reprise puis le remettre dans la file."
          : "La resoumission n'est disponible que pour le demandeur quand le dossier est en attente de corrections."}
      </p>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={4}
        disabled={!canResubmit || isPending}
        placeholder="Précise ce qui a été corrigé avant de renvoyer le dossier..."
        className="mt-4 w-full rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm leading-7 outline-none placeholder:text-[color:var(--muted)] disabled:opacity-60"
      />

      {feedback ? (
        <div className="mt-4 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canResubmit || isPending}
          onClick={handleResubmit}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizonal className="h-4 w-4" />
          {isPending ? "Resoumission..." : "Resoumettre la demande"}
        </button>
      </div>
    </div>
  );
}
