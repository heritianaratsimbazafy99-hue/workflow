import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminWorkflowBuilderRedirect({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; requestType?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  if (typeof resolvedSearchParams.requestType === "string") {
    params.set("requestType", resolvedSearchParams.requestType);
  }

  if (typeof resolvedSearchParams.template === "string") {
    params.set("template", resolvedSearchParams.template);
  }

  const query = params.toString();
  redirect(query ? `/workflow-studio?${query}` : "/workflow-studio");
}
