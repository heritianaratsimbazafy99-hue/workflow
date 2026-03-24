import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAdministration } from "@/lib/admin/service";
import { getEmailConfigHealth } from "@/lib/env/server";
import {
  buildImmediateNotificationEmail,
  resolveEmailActionUrl,
  sendImmediateEmail,
} from "@/lib/notifications/email";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  to: z.string().trim().email().optional().nullable(),
});

export async function POST(request: Request) {
  const actor = await resolveRuntimeActor();
  const service = createSupabaseServiceRoleClient();

  if (!(await canManageAdministration(actor, service))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let requestPayload: z.infer<typeof payloadSchema>;

  try {
    requestPayload = payloadSchema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Payload de test email invalide." }, { status: 400 });
  }

  const targetEmail = requestPayload.to ?? actor.email;

  if (!targetEmail) {
    return NextResponse.json(
      { error: "Aucun email n'est disponible sur le profil connecté." },
      { status: 400 },
    );
  }

  const emailHealth = getEmailConfigHealth();
  const emailPayload = buildImmediateNotificationEmail({
    recipientName: actor.fullName,
    title: "Test email Noria",
    body:
      "Cet email valide la configuration transactionnelle de l'application. Il doit afficher un bouton fonctionnel, un expéditeur cohérent et une adresse de réponse exploitable.",
    actionLabel: "Ouvrir le centre de notifications",
    actionPath: "/notifications",
    categoryLabel: "Vérification configuration email",
    footerNote:
      "Si tu ne reçois rien, vérifie le domaine Resend, le provider configuré, ainsi que APP_BASE_URL / EMAIL_FROM / EMAIL_REPLY_TO.",
  });

  const result = await sendImmediateEmail({
    to: targetEmail,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
  });

  if (result.status === "skipped") {
    return NextResponse.json(
      {
        error: `Envoi non effectué (${result.reason}).`,
        detail: result.detail,
        config: {
          provider: emailHealth.provider,
          emailFrom: emailHealth.emailFrom,
          emailReplyTo: emailHealth.emailReplyTo,
          appBaseUrl: emailHealth.appBaseUrl,
          issues: emailHealth.issues,
          warnings: emailHealth.warnings,
        },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    note:
      result.status === "sent"
        ? `Email envoyé via Resend vers ${targetEmail}.`
        : `Email journalisé en console pour ${targetEmail}.`,
    result,
    preview: {
      subject: emailPayload.subject,
      actionUrl: resolveEmailActionUrl("/notifications"),
      text: emailPayload.text,
    },
    config: {
      provider: emailHealth.provider,
      emailFrom: emailHealth.emailFrom,
      emailReplyTo: emailHealth.emailReplyTo,
      appBaseUrl: emailHealth.appBaseUrl,
      issues: emailHealth.issues,
      warnings: emailHealth.warnings,
    },
  });
}
