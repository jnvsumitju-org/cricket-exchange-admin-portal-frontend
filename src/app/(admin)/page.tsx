"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type Overview = {
  registeredUsers: number;
  playerCount: number;
  openBuyOrders: number;
  openSellOrders: number;
  tradesLast24h: number;
  leagueCount: number;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const o = await apiFetch<Overview>("/admin/overview", { token });
        setData(o);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load overview");
      }
    })();
  }, [token]);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!data) {
    return <p className="text-zinc-500">Loading overview…</p>;
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">Overview</h1>
      <p className="mb-6 text-sm text-zinc-500">Exchange snapshot (non-treasury users in user count below).</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Registered users (excl. treasury)" value={data.registeredUsers} />
        <StatCard label="Players" value={data.playerCount} />
        <StatCard label="Open buy orders" value={data.openBuyOrders} />
        <StatCard label="Open sell orders" value={data.openSellOrders} />
        <StatCard label="Trades (24h)" value={data.tradesLast24h} />
        <StatCard label="Leagues" value={data.leagueCount} />
      </div>
    </div>
  );
}
