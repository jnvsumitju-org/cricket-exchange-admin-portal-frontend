"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type MoverRow = {
  playerId: string;
  name: string;
  team: string;
  currentPrice: string;
  dayOpenPrice: string;
  changePercent: string;
  volume: number;
};

type MoversResponse = {
  gainers: MoverRow[];
  losers: MoverRow[];
  mostTraded: MoverRow[];
};

type FeedEvent = {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  eventType: string;
  pointsImpact: number;
  createdAt: string;
};

function MoverTable({ title, rows }: { title: string; rows: MoverRow[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <h2 className="border-b border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Δ%</th>
              <th className="px-3 py-2 font-medium">Vol 24h</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-zinc-500">
                  No rows.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.playerId}>
                  <td className="px-3 py-2 text-zinc-100">
                    {r.name} <span className="text-zinc-500">({r.team})</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.currentPrice}</td>
                  <td className="px-3 py-2 tabular-nums">{r.changePercent}%</td>
                  <td className="px-3 py-2 tabular-nums">{r.volume}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminMarketPage() {
  const token = useAuthStore((s) => s.token);
  const [movers, setMovers] = useState<MoversResponse | null>(null);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      try {
        const [m, f] = await Promise.all([
          apiFetch<MoversResponse>("/market/movers", { token }),
          apiFetch<{ events: FeedEvent[] }>("/market/match-feed", { token }),
        ]);
        setMovers(m);
        setFeed(f.events);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load market data");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (loading || !movers) return <p className="text-zinc-500">Loading market…</p>;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">Market snapshot</h1>
      <p className="mb-6 text-sm text-zinc-500">Same data as the main app: movers and recent match feed.</p>
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <MoverTable title="Gainers" rows={movers.gainers} />
        <MoverTable title="Losers" rows={movers.losers} />
        <MoverTable title="Most traded (24h)" rows={movers.mostTraded} />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
        <h2 className="border-b border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200">Match feed</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Player</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {feed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-zinc-500">
                    No events.
                  </td>
                </tr>
              ) : (
                feed.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-100">
                      {e.playerName} <span className="text-zinc-500">({e.team})</span>
                    </td>
                    <td className="px-3 py-2">{e.eventType}</td>
                    <td className="px-3 py-2 tabular-nums">{e.pointsImpact}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
