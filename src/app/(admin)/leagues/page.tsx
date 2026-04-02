"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type CricketSource = {
  available: boolean;
  ballDataSource?: "mock" | "cricketdata";
};

type SeriesRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  odi: number;
  t20: number;
  test: number;
  squads: number;
  matches: number;
};

type SeriesListPayload = {
  data?: SeriesRow[];
  status?: string;
  info?: { offsetRows?: number; totalRows?: number };
};

type CurrentSeriesRow = { id: string; name: string; matchCount: number };

type CurrentSeriesPayload = {
  status?: string;
  series?: CurrentSeriesRow[];
};

export default function AdminLeaguesPage() {
  const token = useAuthStore((s) => s.token);

  const [source, setSource] = useState<{ loading: boolean; data: CricketSource | null; error: string | null }>({
    loading: true,
    data: null,
    error: null,
  });

  const [currentSeries, setCurrentSeries] = useState<{
    loading: boolean;
    rows: CurrentSeriesRow[];
    error: string | null;
  }>({ loading: false, rows: [], error: null });

  const [seriesOffset, setSeriesOffset] = useState(0);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesSearchInput, setSeriesSearchInput] = useState("");
  const [seriesList, setSeriesList] = useState<SeriesRow[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [seriesTotal, setSeriesTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setSource((s) => ({ ...s, loading: true, error: null }));
      try {
        const s = await apiFetch<CricketSource>("/admin/cricket/source", { token });
        setSource({ loading: false, data: s, error: null });
      } catch (e) {
        setSource({
          loading: false,
          data: null,
          error: e instanceof ApiError ? e.message : "Failed to load cricket source",
        });
      }
    })();
  }, [token]);

  const cricketEnabled = source.data?.available === true && source.data?.ballDataSource === "cricketdata";

  useEffect(() => {
    if (!token || !cricketEnabled) return;
    void (async () => {
      setCurrentSeries({ loading: true, rows: [], error: null });
      try {
        const res = await apiFetch<CurrentSeriesPayload>("/admin/cricket/current-series", { token });
        setCurrentSeries({
          loading: false,
          rows: Array.isArray(res.series) ? res.series : [],
          error: null,
        });
      } catch (e) {
        setCurrentSeries({
          loading: false,
          rows: [],
          error: e instanceof ApiError ? e.message : "Failed to load series from current matches",
        });
      }
    })();
  }, [token, cricketEnabled]);

  useEffect(() => {
    if (!token || !cricketEnabled) return;
    void (async () => {
      setSeriesLoading(true);
      setSeriesError(null);
      try {
        const sp = new URLSearchParams({ offset: String(seriesOffset) });
        if (seriesSearch.trim()) sp.set("search", seriesSearch.trim());
        const res = await apiFetch<SeriesListPayload>(`/admin/cricket/series?${sp}`, { token });
        const rows = Array.isArray(res.data) ? res.data : [];
        setSeriesList(rows);
        const tr = res.info?.totalRows;
        setSeriesTotal(typeof tr === "number" ? tr : null);
      } catch (e) {
        if (e instanceof ApiError) setSeriesError(e.message);
        else setSeriesError("Failed to load cricket series");
        setSeriesList([]);
      } finally {
        setSeriesLoading(false);
      }
    })();
  }, [token, cricketEnabled, seriesOffset, seriesSearch]);

  const PAGE_SIZE = 25;
  const canPrev = seriesOffset > 0;
  const canNext =
    seriesTotal != null
      ? seriesOffset + seriesList.length < seriesTotal
      : seriesList.length === PAGE_SIZE;

  if (!token) return <p className="text-zinc-500">Sign in to view leagues.</p>;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">Leagues</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Cricket tournaments from CricketData.org when the data service uses{" "}
        <code className="text-zinc-400">BALL_DATA_SOURCE=cricketdata</code>. Series that are live or in the current
        matches feed are listed first; the full <code className="text-zinc-400">/v1/series</code> catalog is often
        sorted with far-future tours first, so IPL and other ongoing leagues may not appear on early pages—use search
        (e.g. <span className="text-zinc-400">IPL</span>) if needed.
      </p>

      {source.loading ? (
        <p className="text-sm text-zinc-500">Checking cricket data service…</p>
      ) : source.error ? (
        <p className="text-sm text-red-400">{source.error}</p>
      ) : !cricketEnabled ? (
        <p className="text-sm text-zinc-400">
          Cricket series are unavailable. Set <code className="text-zinc-500">CRICKET_DATA_API_URL</code> on the
          exchange API, ensure the data-backend is reachable, and set{" "}
          <code className="text-zinc-500">BALL_DATA_SOURCE=cricketdata</code> with a valid{" "}
          <code className="text-zinc-500">CRICKETDATA_API_KEY</code> on the data-backend.
        </p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Series in current matches feed
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Built from paginated <code className="text-zinc-600">currentMatches</code> (deduped by{" "}
              <code className="text-zinc-600">series_id</code>). Opening this page may trigger several upstream API
              calls.
            </p>
            {currentSeries.loading ? (
              <p className="text-sm text-zinc-500">Loading current tournaments…</p>
            ) : currentSeries.error ? (
              <p className="mb-4 text-sm text-amber-400/90">{currentSeries.error}</p>
            ) : currentSeries.rows.length === 0 ? (
              <p className="mb-4 text-sm text-zinc-500">No series found in the current matches feed.</p>
            ) : (
              <div className="mb-4 overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Series</th>
                      <th className="px-3 py-2 font-medium">Matches in feed</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {currentSeries.rows.map((s) => (
                      <tr key={s.id} className="text-zinc-300">
                        <td className="px-3 py-2 text-zinc-100">{s.name}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">{s.matchCount}</td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/leagues/cricket/${encodeURIComponent(s.id)}`}
                            className="text-sm font-medium text-sky-400 hover:text-sky-300"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Browse all series</h2>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">Search</label>
                <input
                  value={seriesSearchInput}
                  onChange={(e) => setSeriesSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSeriesOffset(0);
                      setSeriesSearch(seriesSearchInput.trim());
                    }
                  }}
                  placeholder="e.g. IPL 2026"
                  className="w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSeriesOffset(0);
                  setSeriesSearch(seriesSearchInput.trim());
                }}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              >
                Search
              </button>
            </div>

            {seriesError && <p className="mb-3 text-sm text-red-400">{seriesError}</p>}
            {seriesLoading ? (
              <p className="text-sm text-zinc-500">Loading series…</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Start</th>
                        <th className="px-3 py-2 font-medium">End</th>
                        <th className="px-3 py-2 font-medium">T20 / ODI / Test</th>
                        <th className="px-3 py-2 font-medium">Matches</th>
                        <th className="px-3 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {seriesList.map((s) => (
                        <tr key={s.id} className="text-zinc-300">
                          <td className="px-3 py-2 text-zinc-100">{s.name}</td>
                          <td className="px-3 py-2 font-mono text-xs text-zinc-400">{s.startDate}</td>
                          <td className="px-3 py-2 font-mono text-xs text-zinc-400">{s.endDate}</td>
                          <td className="px-3 py-2 tabular-nums text-zinc-400">
                            {s.t20} / {s.odi} / {s.test}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{s.matches}</td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/leagues/cricket/${encodeURIComponent(s.id)}`}
                              className="text-sm font-medium text-sky-400 hover:text-sky-300"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!canPrev || seriesLoading}
                    onClick={() => setSeriesOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!canNext || seriesLoading || seriesList.length === 0}
                    onClick={() => setSeriesOffset((o) => o + PAGE_SIZE)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                  <span className="text-xs text-zinc-500">
                    Offset {seriesOffset}
                    {seriesTotal != null ? ` · ${seriesTotal} total` : null}
                  </span>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
