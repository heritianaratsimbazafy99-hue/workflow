import { NextResponse } from "next/server";
import { getLiveModeIssue, resolveRuntimeActor } from "@/lib/workflow/runtime";
import { getMessagesWorkspaceData } from "@/lib/workflow/messages";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await resolveRuntimeActor();
  const liveModeIssue = getLiveModeIssue(actor);

  if (liveModeIssue) {
    return NextResponse.json({ error: liveModeIssue.message }, { status: liveModeIssue.status });
  }

  const conversationId = new URL(request.url).searchParams.get("conversation") ?? undefined;
  const data = await getMessagesWorkspaceData(conversationId);

  return NextResponse.json({
    mode: data.mode,
    actor: {
      id: data.actor.id,
    },
    conversations: data.conversations,
    activeConversationId: data.activeConversationId,
    messages: data.messages,
  });
}
