"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type PlayerRow = {
  id: string;
  name: string;
  team: string;
  role: string;
  currentPrice: string;
  totalShares: number;
  circulatingShares: number;
  marketCap: string;
  dailyChangeLimitPercent: string;
  circuitBreakerPercent: string;
};

export default function AdminPlayersPage() {
  const token = useAuthStore((s) => s.token);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftDaily, setDraftDaily] = useState("");
  const [draftCircuit, setDraftCircuit] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await apiFetch<{ players: PlayerRow[] }>("/admin/players", { token });
        setPlayers(res.players);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load players");
      }
    })();
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
    );
  }, [players, filter]);

  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-white">Players</h1>
      <input
        type="search"
        placeholder="Filter by name, team, role…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
      />
      {saveError ? <p className="mb-2 text-sm text-red-400">{saveError}</p> : null}
      {players.length === 0 ? (
        <p className="text-zinc-500">Loading players…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Circ / Total</th>
                <th className="px-3 py-2 font-medium">Market cap</th>
                <th className="px-3 py-2 font-medium">Daily limit %</th>
                <th className="px-3 py-2 font-medium">Circuit %</th>
                <th className="px-3 py-2 font-medium">Limits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((p) => (
                <tr key={p.id} className="text-zinc-300">
                  <td className="px-3 py-2 font-medium text-zinc-100">{p.name}</td>
                  <td className="px-3 py-2">{p.team}</td>
                  <td className="px-3 py-2">{p.role}</td>
                  <td className="px-3 py-2 tabular-nums">{p.currentPrice}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {p.circulatingShares} / {p.totalShares}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{p.marketCap}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {editId === p.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={draftDaily}
                        onChange={(e) => setDraftDaily(e.target.value)}
                        className="w-20 rounded border border-zinc-600 bg-zinc-950 px-1 py-0.5 text-zinc-100"
                      />
                    ) : (
                      p.dailyChangeLimitPercent
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {editId === p.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={draftCircuit}
                        onChange={(e) => setDraftCircuit(e.target.value)}
                        className="w-20 rounded border border-zinc-600 bg-zinc-950 px-1 py-0.5 text-zinc-100"
                      />
                    ) : (
                      p.circuitBreakerPercent
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editId === p.id ? (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setSaveError(null);
                            setSaving(true);
                            const body: { dailyChangeLimitPercent?: number; circuitBreakerPercent?: number } = {};
                            const d = parseFloat(draftDaily);
                            const c = parseFloat(draftCircuit);
                            if (!Number.isNaN(d)) body.dailyChangeLimitPercent = d;
                            if (!Number.isNaN(c)) body.circuitBreakerPercent = c;
                            if (Object.keys(body).length === 0) {
                              setSaveError("Enter at least one limit value");
                              setSaving(false);
                              return;
                            }
                            void (async () => {
                              try {
                                await apiFetch(`/admin/players/${encodeURIComponent(p.id)}`, {
                                  method: "PATCH",
                                  token,
                                  body: JSON.stringify(body),
                                  idempotencyKey: crypto.randomUUID(),
                                });
                                setEditId(null);
                                reload();
                              } catch (e) {
                                if (e instanceof ApiError) setSaveError(e.message);
                                else setSaveError("Save failed");
                              } finally {
                                setSaving(false);
                              }
                            })();
                          }}
                          className="rounded bg-emerald-900/60 px-2 py-1 text-xs text-emerald-100"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setEditId(null)}
                          className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(p.id);
                          setDraftDaily(p.dailyChangeLimitPercent);
                          setDraftCircuit(p.circuitBreakerPercent);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Edit limits
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {players.length > 0 ? (
        <p className="mt-2 text-xs text-zinc-600">
          Showing {filtered.length} of {players.length} players
        </p>
      ) : null}
    </div>
  );
}
