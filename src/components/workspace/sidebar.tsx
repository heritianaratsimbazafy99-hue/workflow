"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  House,
  MessageSquareMore,
  Plus,
  Settings2,
  ShieldCheck,
  Waypoints,
} from "lucide-react";

const navigation = [
  {
    href: "/workspace",
    label: "Pilotage",
    icon: House,
  },
  {
    href: "/approvals",
    label: "Approvals",
    icon: ShieldCheck,
  },
  {
    href: "/requests/new",
    label: "Nouvelle demande",
    icon: Plus,
  },
  {
    href: "/messages",
    label: "Messagerie",
    icon: MessageSquareMore,
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Settings2,
  },
] as const;

export function WorkspaceSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[color:var(--line)] bg-[color:var(--surface)] px-5 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-[color:var(--surface-strong)]">
          <Waypoints className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
            Noria
          </p>
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Workflow interne
          </p>
        </div>
      </Link>

      <div className="mt-8 rounded-[26px] border border-[color:var(--line)] bg-white/75 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          En direct
        </p>
        <div className="mt-4 space-y-3 text-sm text-[color:var(--foreground)]">
          <div className="flex items-center justify-between">
            <span>Demandes critiques</span>
            <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-1 text-xs">
              4
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Messages non lus</span>
            <span className="rounded-full bg-[color:var(--brand-soft)] px-2 py-1 text-xs">
              7
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Relances du jour</span>
            <span className="rounded-full bg-[color:var(--surface-strong)] px-2 py-1 text-xs">
              12
            </span>
          </div>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/workspace" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                isActive
                  ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                  : "text-[color:var(--foreground)] hover:bg-white/65"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[26px] border border-[color:var(--line)] bg-[color:var(--foreground)] p-4 text-[color:var(--surface-strong)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Mode opératoire</p>
            <p className="text-xs text-white/65">
              Tester local puis preview puis production.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
