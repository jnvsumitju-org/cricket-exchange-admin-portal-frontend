"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type UserDetail = {
  user: {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    isTreasury: boolean;
    isAdmin: boolean;
    isSuspended: boolean;
    suspendedReason: string | null;
    suspendedAt: string | null;
  };
  wallet: { balance: string; reservedBalance: string } | null;
  openOrderCounts: { buys: number; sells: number };
  holdings: Array<{
    playerId: string;
    playerName: string;
    team: string;
    quantity: number;
    avgBuyPrice: string;
    currentPrice: string;
  }>;
  recentExecutions: Array<{
    id: string;
    playerId: string;
    playerName: string;
    playerTeam: string;
    quantity: number;
    price: string;
    executedAt: string;
    buyOrderUserId: string;
    sellOrderUserId: string | null;
    side: "BUY" | "SELL";
  }>;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const reload = useCallback(() => {
    if (!token || !id) return;
    void (async () => {
      try {
        const d = await apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(id)}`, { token });
        setData(d);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load user");
      }
    })();
  }, [token, id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!id) return <p className="text-red-400">Invalid user id</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-zinc-500">Loading user…</p>;

  const { user, wallet, openOrderCounts, holdings, recentExecutions } = data;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <Link href="/users" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Users
        </Link>
        <h1 className="text-xl font-semibold text-white">{user.username}</h1>
        <span className="text-sm text-zinc-500">{user.email}</span>
        {user.isSuspended ? (
          <span className="rounded bg-rose-900/50 px-2 py-0.5 text-xs font-medium text-rose-200">Suspended</span>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <span className="text-zinc-400">
          Open orders: {openOrderCounts.buys} buys / {openOrderCounts.sells} sells
        </span>
        <Link
          href={`/open-orders?userId=${encodeURIComponent(user.id)}`}
          className="text-emerald-400 hover:text-emerald-300"
        >
          View open orders →
        </Link>
      </div>

      {!user.isTreasury && !user.isAdmin ? (
        <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Account control</h2>
          {user.suspendedReason ? (
            <p className="mt-2 text-sm text-zinc-400">Reason: {user.suspendedReason}</p>
          ) : null}
          {user.suspendedAt ? (
            <p className="text-xs text-zinc-500">Since {new Date(user.suspendedAt).toLocaleString()}</p>
          ) : null}
          {actionError ? <p className="mt-2 text-sm text-red-400">{actionError}</p> : null}
          {user.isSuspended ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                setActionError(null);
                setActionBusy(true);
                void (async () => {
                  try {
                    await apiFetch(`/admin/users/${encodeURIComponent(user.id)}/unsuspend`, {
                      method: "POST",
                      token,
                      body: JSON.stringify({}),
                      idempotencyKey: crypto.randomUUID(),
                    });
                    reload();
                  } catch (e) {
                    if (e instanceof ApiError) setActionError(e.message);
                    else setActionError("Request failed");
                  } finally {
                    setActionBusy(false);
                  }
                })();
              }}
              className="mt-3 rounded-lg bg-emerald-900/60 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-800/60 disabled:opacity-50"
            >
              Unsuspend user
            </button>
          ) : (
            <div className="mt-3 flex max-w-md flex-col gap-2">
              <label className="text-xs text-zinc-500">
                Reason (optional)
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
                />
              </label>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  if (!confirm("Suspend this user? They cannot trade until unsuspended.")) return;
                  setActionError(null);
                  setActionBusy(true);
                  void (async () => {
                    try {
                      await apiFetch(`/admin/users/${encodeURIComponent(user.id)}/suspend`, {
                        method: "POST",
                        token,
                        body: JSON.stringify({ reason: suspendReason.trim() || undefined }),
                        idempotencyKey: crypto.randomUUID(),
                      });
                      setSuspendReason("");
                      reload();
                    } catch (e) {
                      if (e instanceof ApiError) setActionError(e.message);
                      else setActionError("Request failed");
                    } finally {
                      setActionBusy(false);
                    }
                  })();
                }}
                className="rounded-lg bg-rose-900/60 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-800/60 disabled:opacity-50"
              >
                Suspend user
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Profile</h2>
        <dl className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">User id</dt>
            <dd className="font-mono text-xs text-zinc-400">{user.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Joined</dt>
            <dd>{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Treasury</dt>
            <dd>{user.isTreasury ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Admin</dt>
            <dd>{user.isAdmin ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Suspended</dt>
            <dd>{user.isSuspended ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Wallet</h2>
        {wallet ? (
          <dl className="mt-3 flex flex-wrap gap-6 text-sm text-zinc-300">
            <div>
              <dt className="text-zinc-500">Balance</dt>
              <dd className="tabular-nums">{wallet.balance}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Reserved</dt>
              <dd className="tabular-nums">{wallet.reservedBalance}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No wallet row.</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-200">Holdings</h2>
        {holdings.length === 0 ? (
          <p className="text-sm text-zinc-500">No holdings.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Avg buy</th>
                  <th className="px-3 py-2 font-medium">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {holdings.map((h) => (
                  <tr key={h.playerId}>
                    <td className="px-3 py-2 text-zinc-100">
                      {h.playerName} <span className="text-zinc-500">({h.team})</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{h.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">{h.avgBuyPrice}</td>
                    <td className="px-3 py-2 tabular-nums">{h.currentPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-200">Recent executions</h2>
        {recentExecutions.length === 0 ? (
          <p className="text-sm text-zinc-500">None.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {recentExecutions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                      {new Date(t.executedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          t.side === "BUY"
                            ? "rounded bg-emerald-900/40 px-1.5 py-0.5 text-emerald-200"
                            : "rounded bg-rose-900/40 px-1.5 py-0.5 text-rose-200"
                        }
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-100">
                      {t.playerName} <span className="text-zinc-500">({t.playerTeam})</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">{t.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
