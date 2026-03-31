"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useAuthStore } from "@/store/authStore";

type TradeRow = {
  id: string;
  playerId: string;
  playerName: string;
  playerTeam: string;
  quantity: number;
  price: string;
  executedAt: string;
  buyOrderUserId: string;
  sellOrderUserId: string | null;
};

type TradesLimitResponse = { trades: TradeRow[] };
type TradesPageResponse = { trades: TradeRow[]; page: number; pageSize: number; total: number };

type AppliedFilters = {
  playerId: string;
  sinceLocal: string;
  limit: number;
  usePages: boolean;
};

function sinceToIso(sinceLocal: string): string | undefined {
  if (!sinceLocal.trim()) return undefined;
  const d = new Date(sinceLocal);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function AdminTradesPage() {
  const token = useAuthStore((s) => s.token);
  const [draftPlayerId, setDraftPlayerId] = useState("");
  const [draftSinceLocal, setDraftSinceLocal] = useState("");
  const [draftLimit, setDraftLimit] = useState(100);
  const [draftUsePages, setDraftUsePages] = useState(false);

  const [applied, setApplied] = useState<AppliedFilters>({
    playerId: "",
    sinceLocal: "",
    limit: 100,
    usePages: false,
  });
  const [page, setPage] = useState(1);

  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<{ page: number; pageSize: number; total: number } | null>(null);

  const runFetch = useCallback(
    async (f: AppliedFilters, pageNum: number) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams();
        if (f.playerId.trim()) q.set("playerId", f.playerId.trim());
        const sinceIso = sinceToIso(f.sinceLocal);
        if (sinceIso) q.set("since", sinceIso);

        if (f.usePages) {
          q.set("page", String(pageNum));
          q.set("pageSize", "50");
          const res = await apiFetch<TradesPageResponse>(`/admin/trades/recent?${q}`, { token });
          setTrades(res.trades);
          setPageMeta({ page: res.page, pageSize: res.pageSize, total: res.total });
        } else {
          q.set("limit", String(Math.min(200, Math.max(1, f.limit))));
          const res = await apiFetch<TradesLimitResponse>(`/admin/trades/recent?${q}`, { token });
          setTrades(res.trades);
          setPageMeta(null);
        }
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load trades");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    void runFetch(applied, page);
  }, [token, applied, page, runFetch]);

  const applyFilters = () => {
    setApplied({
      playerId: draftPlayerId,
      sinceLocal: draftSinceLocal,
      limit: draftLimit,
      usePages: draftUsePages,
    });
    setPage(1);
  };

  if (error) return <p className="text-red-400">{error}</p>;

  const totalPages =
    pageMeta && pageMeta.pageSize > 0 ? Math.max(1, Math.ceil(pageMeta.total / pageMeta.pageSize)) : 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Recent trades</h1>
        {trades.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const rows: string[][] = [
                [
                  "executedAt",
                  "playerId",
                  "playerName",
                  "playerTeam",
                  "quantity",
                  "price",
                  "buyOrderUserId",
                  "sellOrderUserId",
                ],
                ...trades.map((t) => [
                  t.executedAt,
                  t.playerId,
                  t.playerName,
                  t.playerTeam,
                  String(t.quantity),
                  t.price,
                  t.buyOrderUserId,
                  t.sellOrderUserId ?? "",
                ]),
              ];
              downloadCsv(`trades-${applied.usePages ? `p${pageMeta?.page ?? page}` : "limit"}.csv`, rows);
            }}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Download CSV (loaded rows)
          </button>
        ) : null}
      </div>

      <div className="mb-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Player id
            <input
              value={draftPlayerId}
              onChange={(e) => setDraftPlayerId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-200"
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Since (local)
            <input
              type="datetime-local"
              value={draftSinceLocal}
              onChange={(e) => setDraftSinceLocal(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
            />
          </label>
          {!draftUsePages ? (
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Limit (max 200)
              <input
                type="number"
                min={1}
                max={200}
                value={draftLimit}
                onChange={(e) => setDraftLimit(Number(e.target.value) || 50)}
                className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={draftUsePages}
              onChange={(e) => setDraftUsePages(e.target.checked)}
            />
            Paginate (50 / page)
          </label>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading trades…</p>
      ) : trades.length === 0 ? (
        <p className="text-zinc-500">No executions for this filter.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Buyer user</th>
                  <th className="px-3 py-2 font-medium">Seller user</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {trades.map((t) => (
                  <tr key={t.id} className="text-zinc-300">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                      {new Date(t.executedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-100">
                      {t.playerName} <span className="text-zinc-500">({t.playerTeam})</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">{t.price}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs">{t.buyOrderUserId}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs">
                      {t.sellOrderUserId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {applied.usePages && pageMeta ? (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>
                Page {pageMeta.page} of {totalPages} ({pageMeta.total} trades)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-zinc-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-zinc-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
