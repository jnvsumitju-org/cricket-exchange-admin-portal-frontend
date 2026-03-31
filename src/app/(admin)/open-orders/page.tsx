"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useAuthStore } from "@/store/authStore";

type OrderRow = {
  id: string;
  side: "buy" | "sell";
  userId: string;
  username: string;
  playerId: string;
  playerName: string;
  price: string;
  remainingQuantity: number;
  createdAt: string;
};

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  orders: OrderRow[];
};

export default function AdminOpenOrdersPage() {
  const token = useAuthStore((s) => s.token);
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);

  const [draftPlayerId, setDraftPlayerId] = useState("");
  const [draftUserId, setDraftUserId] = useState("");
  const [draftSide, setDraftSide] = useState<"" | "buy" | "sell">("");

  const [appliedPlayerId, setAppliedPlayerId] = useState("");
  const [appliedUserId, setAppliedUserId] = useState("");
  const [appliedSide, setAppliedSide] = useState<"" | "buy" | "sell">("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);

  useEffect(() => {
    const u = searchParams.get("userId") ?? "";
    const p = searchParams.get("playerId") ?? "";
    const s = searchParams.get("side");
    const sideVal = s === "buy" || s === "sell" ? s : "";
    setDraftUserId(u);
    setDraftPlayerId(p);
    setDraftSide(sideVal);
    setAppliedUserId(u);
    setAppliedPlayerId(p);
    setAppliedSide(sideVal);
    setPage(1);
    setHydrated(true);
  }, [searchParams]);

  const runFetch = useCallback(
    async (p: number, playerId: string, userId: string, side: "" | "buy" | "sell") => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({ page: String(p), pageSize: "20" });
        if (playerId.trim()) q.set("playerId", playerId.trim());
        if (userId.trim()) q.set("userId", userId.trim());
        if (side) q.set("side", side);
        const res = await apiFetch<ListResponse>(`/admin/open-orders?${q}`, { token });
        setData(res);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load open orders");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!hydrated || !token) return;
    void runFetch(page, appliedPlayerId, appliedUserId, appliedSide);
  }, [hydrated, token, page, appliedPlayerId, appliedUserId, appliedSide, runFetch]);

  const applyFilters = () => {
    setAppliedPlayerId(draftPlayerId);
    setAppliedUserId(draftUserId);
    setAppliedSide(draftSide);
    setPage(1);
  };

  if (!hydrated) return <p className="text-zinc-500">Loading…</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (loading && !data) return <p className="text-zinc-500">Loading open orders…</p>;
  if (!data) return <p className="text-zinc-500">Loading open orders…</p>;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Open orders</h1>
        <button
          type="button"
          onClick={() => {
            const rows: string[][] = [
              ["createdAt", "side", "orderId", "userId", "username", "playerId", "playerName", "price", "remaining"],
              ...data.orders.map((o) => [
                o.createdAt,
                o.side,
                o.id,
                o.userId,
                o.username,
                o.playerId,
                o.playerName,
                o.price,
                String(o.remainingQuantity),
              ]),
            ];
            downloadCsv(`open-orders-page-${data.page}.csv`, rows);
          }}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Download CSV (this page)
        </button>
      </div>
      {cancelError ? <p className="mb-2 text-sm text-red-400">{cancelError}</p> : null}

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Player id
          <input
            value={draftPlayerId}
            onChange={(e) => setDraftPlayerId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-200"
            placeholder="cuid…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          User id
          <input
            value={draftUserId}
            onChange={(e) => setDraftUserId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-200"
            placeholder="cuid…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Side
          <select
            value={draftSide}
            onChange={(e) => setDraftSide(e.target.value as "" | "buy" | "sell")}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
          >
            <option value="">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500">Refreshing…</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Side</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Remaining</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {data.orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                  No open orders for this filter.
                </td>
              </tr>
            ) : (
              data.orders.map((o) => (
                <tr key={`${o.side}-${o.id}`}>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 uppercase text-zinc-200">{o.side}</td>
                  <td className="px-3 py-2">
                    <span className="text-zinc-100">{o.username}</span>
                    <br />
                    <span className="font-mono text-xs text-zinc-500">{o.userId}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-zinc-100">{o.playerName}</span>
                    <br />
                    <span className="font-mono text-xs text-zinc-500">{o.playerId}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{o.price}</td>
                  <td className="px-3 py-2 tabular-nums">{o.remainingQuantity}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={cancellingKey !== null}
                      onClick={() => {
                        if (!confirm(`Cancel this ${o.side} order?`)) return;
                        setCancelError(null);
                        const k = `${o.side}-${o.id}`;
                        setCancellingKey(k);
                        const path =
                          o.side === "buy"
                            ? `/admin/orders/buy/${encodeURIComponent(o.id)}/cancel`
                            : `/admin/orders/sell/${encodeURIComponent(o.id)}/cancel`;
                        void (async () => {
                          try {
                            await apiFetch(path, {
                              method: "POST",
                              token,
                              body: JSON.stringify({}),
                              idempotencyKey: crypto.randomUUID(),
                            });
                            await runFetch(page, appliedPlayerId, appliedUserId, appliedSide);
                          } catch (e) {
                            if (e instanceof ApiError) setCancelError(e.message);
                            else setCancelError("Cancel failed");
                          } finally {
                            setCancellingKey(null);
                          }
                        })();
                      }}
                      className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {cancellingKey === `${o.side}-${o.id}` ? "…" : "Cancel"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Page {data.page} of {totalPages} ({data.total} orders)
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
    </div>
  );
}
