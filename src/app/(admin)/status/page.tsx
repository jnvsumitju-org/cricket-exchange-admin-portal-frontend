"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError, getApiBase, getCricketDataBase } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type HealthOk = { ok?: boolean; service?: string; [k: string]: unknown };

type MatchQueueInfo = { key: string; length: number };

export default function AdminStatusPage() {
  const token = useAuthStore((s) => s.token);
  const [matchQueue, setMatchQueue] = useState<{
    loading: boolean;
    data: MatchQueueInfo | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const [exchange, setExchange] = useState<{ loading: boolean; data: HealthOk | null; error: string | null }>({
    loading: true,
    data: null,
    error: null,
  });
  const [cricket, setCricket] = useState<{ loading: boolean; data: HealthOk | null; error: string | null; skipped: boolean }>(
    { loading: true, data: null, error: null, skipped: false }
  );

  useEffect(() => {
    const base = getApiBase();
    void (async () => {
      try {
        const res = await fetch(`${base}/health`);
        const text = await res.text();
        let data: HealthOk | null = null;
        if (text) {
          try {
            data = JSON.parse(text) as HealthOk;
          } catch {
            data = { raw: text } as HealthOk;
          }
        }
        if (!res.ok) {
          setExchange({ loading: false, data: null, error: res.statusText || `HTTP ${res.status}` });
          return;
        }
        setExchange({ loading: false, data, error: null });
      } catch (e) {
        setExchange({
          loading: false,
          data: null,
          error: e instanceof Error ? e.message : "Request failed",
        });
      }
    })();
  }, []);

  useEffect(() => {
    const cricketBase = getCricketDataBase();
    if (!cricketBase) {
      setCricket({ loading: false, data: null, error: null, skipped: true });
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${cricketBase}/health`);
        const text = await res.text();
        let data: HealthOk | null = null;
        if (text) {
          try {
            data = JSON.parse(text) as HealthOk;
          } catch {
            data = { raw: text } as HealthOk;
          }
        }
        if (!res.ok) {
          setCricket({ loading: false, data: null, error: res.statusText || `HTTP ${res.status}`, skipped: false });
          return;
        }
        setCricket({ loading: false, data, error: null, skipped: false });
      } catch (e) {
        setCricket({
          loading: false,
          data: null,
          error: e instanceof Error ? e.message : "Request failed",
          skipped: false,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) {
      setMatchQueue({ loading: false, data: null, error: null });
      return;
    }
    setMatchQueue((s) => ({ ...s, loading: true }));
    void (async () => {
      try {
        const data = await apiFetch<MatchQueueInfo>("/admin/ops/match-queue", { token });
        setMatchQueue({ loading: false, data, error: null });
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.status === 403
              ? String(
                  typeof e.body === "object" && e.body && "error" in e.body
                    ? (e.body as { error: string }).error
                    : e.message
                )
              : e.message
            : "Request failed";
        setMatchQueue({ loading: false, data: null, error: msg });
      }
    })();
  }, [token]);

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">Status</h1>
      <p className="mb-6 text-sm text-zinc-500">Public health endpoints (no auth).</p>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Exchange API</h2>
        <p className="mt-1 font-mono text-xs text-zinc-500">{getApiBase()}/health</p>
        {exchange.loading ? (
          <p className="mt-3 text-sm text-zinc-500">Checking…</p>
        ) : exchange.error ? (
          <p className="mt-3 text-sm text-red-400">{exchange.error}</p>
        ) : (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-emerald-200">
            {JSON.stringify(exchange.data, null, 2)}
          </pre>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Match queue (Redis)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Requires admin session and <code className="text-zinc-400">ADMIN_ALLOW_REDIS_QUEUE_INSPECT=true</code> on the API.
        </p>
        {!token ? (
          <p className="mt-3 text-sm text-zinc-500">Sign in to load queue depth.</p>
        ) : matchQueue.loading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : matchQueue.error ? (
          <p className="mt-3 text-sm text-amber-400/90">{matchQueue.error}</p>
        ) : matchQueue.data ? (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-emerald-200">
            {JSON.stringify(matchQueue.data, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Cricket data service</h2>
        {cricket.skipped ? (
          <p className="mt-3 text-sm text-zinc-500">
            Not configured. Set <code className="text-zinc-400">NEXT_PUBLIC_CRICKET_DATA_URL</code> to enable.
          </p>
        ) : cricket.loading ? (
          <p className="mt-3 text-sm text-zinc-500">Checking…</p>
        ) : cricket.error ? (
          <p className="mt-3 text-sm text-red-400">{cricket.error}</p>
        ) : (
          <>
            <p className="mt-1 font-mono text-xs text-zinc-500">{getCricketDataBase()}/health</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-emerald-200">
              {JSON.stringify(cricket.data, null, 2)}
            </pre>
          </>
        )}
      </section>
    </div>
  );
}
