"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

const nav = [
  { href: "/", label: "Overview" },
  { href: "/status", label: "Status" },
  { href: "/market", label: "Market" },
  { href: "/leagues", label: "Leagues" },
  { href: "/users", label: "Users" },
  { href: "/players", label: "Players" },
  { href: "/open-orders", label: "Open orders" },
  { href: "/trades", label: "Trades" },
  { href: "/metrics", label: "Metrics" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
        <div className="border-b border-zinc-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">IPL Trader</p>
          <p className="text-sm font-medium text-zinc-100">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-800 p-2">
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
