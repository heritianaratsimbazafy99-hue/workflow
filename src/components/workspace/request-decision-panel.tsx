"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ShieldCheck, XCircle } from "lucide-react";

export function RequestDecisionPanel({
  requestReference,
  canAct,
  currentApproverLabel,
}: {
  requestReference: string;
  canAct: boolean;
  currentApproverLabel: string | null;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitDecision(decision: "approve" | "reject" | "return") {
    setFeedback(null);

    startTransition(() => {
      void sendDecision(decision);
    });
  }

  async function sendDecision(decision: "approve" | "reject" | "return") {
    try {
      const response = await fetch(`/api/requests/${requestReference}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          comment,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        note?: string;
      };

      if (!response.ok) {
        setFeedback(data.error ?? "Impossible de traiter cette décision.");
        return;
      }

      setComment("");
      setFeedback(data.note ?? "Décision enregistrée.");
      router.refresh();
    } catch {
      setFeedback("Erreur réseau pendant la décision.");
    }
  }

  return (
    <div className="rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
        Action workflow
      </p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
        Décider sur cette étape
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
        {canAct
          ? `Tu es habilité à agir sur cette étape. ${
              currentApproverLabel ? `Assignee actuel: ${currentApproverLabel}.` : ""
            }`
          : "Aucune action disponible pour l’utilisateur courant sur cette demande."}
      </p>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={4}
        disabled={!canAct || isPending}
        placeholder="Commentaire de décision, justification, précision au demandeur..."
        className="mt-4 w-full rounded-[22px] border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm leading-7 outline-none placeholder:text-[color:var(--muted)] disabled:opacity-60"
      />

      {feedback ? (
        <div className="mt-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canAct || isPending}
          onClick={() => submitDecision("approve")}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          Approuver
        </button>
        <button
          type="button"
          disabled={!canAct || isPending}
          onClick={() => submitDecision("return")}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Retour correction
        </button>
        <button
          type="button"
          disabled={!canAct || isPending}
          onClick={() => submitDecision("reject")}
          className="inline-flex items-center gap-2 rounded-full border border-[#f2c0b2] bg-[#fff1ed] px-4 py-2 text-sm font-medium text-[#8f3c25] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Rejeter
        </button>
      </div>
    </div>
  );
}
