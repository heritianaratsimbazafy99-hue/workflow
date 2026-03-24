import { NextResponse } from "next/server";
import { canManageAdministration } from "@/lib/admin/service";
import { buildImmediateNotificationEmail, sendImmediateEmail } from "@/lib/notifications/email";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

export async function POST() {
  const actor = await resolveRuntimeActor();
  const service = createSupabaseServiceRoleClient();

  if (!(await canManageAdministration(actor, service))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (!actor.email) {
    return NextResponse.json(
      { error: "Aucun email n'est disponible sur le profil connecté." },
      { status: 400 },
    );
  }

  const payload = buildImmediateNotificationEmail({
    recipientName: actor.fullName,
    title: "Test email Noria",
    body: "Cet email valide la configuration transactionnelle de l'application.",
    actionLabel: "Ouvrir le centre de notifications",
    actionPath: "/notifications",
  });

  const result = await sendImmediateEmail({
    to: actor.email,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  if (result.status === "skipped") {
    return NextResponse.json(
      { error: `Envoi non effectué (${result.reason}).` },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, result });
}
