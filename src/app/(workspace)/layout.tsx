import type { ReactNode } from "react";
import { WorkspaceFrame } from "@/components/workspace/app-shell";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
