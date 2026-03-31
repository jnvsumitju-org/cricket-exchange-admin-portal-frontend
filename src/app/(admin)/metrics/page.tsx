"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useAuthStore } from "@/store/authStore";

type DayRow = { day: string; tradeCount: number; volume: number };

type MetricsResponse = {
  from: string;
  to: string;
  days: DayRow[];
};

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function AdminMetricsPage() {
  const token = useAuthStore((s) => s.token);
  const [from, setFrom] = useState(defaultRange().from);
  const [to, setTo] = useState(defaultRange().to);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const q = new URLSearchParams({ from, to });
        const res = await apiFetch<MetricsResponse>(`/admin/metrics/trades-by-day?${q}`, { token });
        setData(res);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">Trade volume by day</h1>
      <p className="mb-6 text-sm text-zinc-500">UTC day buckets from trade executions.</p>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          From (date)
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          To (date)
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Apply"}
        </button>
        {data?.days.length ? (
          <button
            type="button"
            onClick={() => {
              const rows: string[][] = [
                ["day", "tradeCount", "volume"],
                ...data.days.map((d) => [d.day, String(d.tradeCount), String(d.volume)]),
              ];
              downloadCsv(`trades-by-day-${from}-${to}.csv`, rows);
            }}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Download CSV
          </button>
        ) : null}
      </div>

      {!data ? (
        <p className="text-zinc-500">Loading…</p>
      ) : data.days.length === 0 ? (
        <p className="text-zinc-500">No trades in this range.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Day (UTC)</th>
                <th className="px-3 py-2 font-medium">Executions</th>
                <th className="px-3 py-2 font-medium">Volume (shares)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {data.days.map((d) => (
                <tr key={d.day}>
                  <td className="px-3 py-2 font-mono text-zinc-100">{d.day}</td>
                  <td className="px-3 py-2 tabular-nums">{d.tradeCount}</td>
                  <td className="px-3 py-2 tabular-nums">{d.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
