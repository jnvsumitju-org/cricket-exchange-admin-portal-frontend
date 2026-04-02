"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { getMatchScheduleUi, MatchStatusPill } from "@/lib/cricketMatchSchedule";
import { useAuthStore } from "@/store/authStore";

type TeamInfo = { name: string; shortname?: string; img?: string };

type ScoreInning = { r: number; w: number; o: number; inning: string };

type MatchInfoData = {
  id: string;
  name: string;
  matchType?: string;
  status: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  teamInfo?: TeamInfo[];
  score?: ScoreInning[];
  tossWinner?: string;
  tossChoice?: string;
  matchWinner?: string;
  series_id?: string;
  matchStarted?: boolean;
  matchEnded?: boolean;
};

type MatchInfoPayload = { data?: MatchInfoData };

type ScorecardPayload = { data?: Record<string, unknown> };

type SyncedDelivery = {
  id: string;
  inningsNumber: number;
  battingTeamShortName: string;
  over: number;
  ballInOver: number;
  runsOffBat: number;
  extraRuns: number;
  wicketType: string | null;
  batsmanName: string;
  bowlerName: string;
  commentary: string;
  createdAt: string;
};

type SyncedDeliveriesPayload = {
  ok: boolean;
  source?: string;
  message?: string;
  deliveryCount?: number;
  deliveries?: SyncedDelivery[];
};

type Tab = "summary" | "scorecard";

export default function AdminCricketMatchDetailPage() {
  const params = useParams();
  const seriesId = typeof params.seriesId === "string" ? params.seriesId : "";
  const matchId = typeof params.matchId === "string" ? params.matchId : "";
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>("summary");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const feedScrollRef = useRef<HTMLDivElement>(null);

  const [seriesTitle, setSeriesTitle] = useState<string | null>(null);

  const [infoRes, setInfoRes] = useState<{
    loading: boolean;
    data: MatchInfoPayload | null;
    error: string | null;
  }>({ loading: true, data: null, error: null });

  const [cardRes, setCardRes] = useState<{
    loading: boolean;
    data: ScorecardPayload | null;
    error: string | null;
    loaded: boolean;
  }>({ loading: false, data: null, error: null, loaded: false });

  const [ballRes, setBallRes] = useState<{
    loading: boolean;
    data: SyncedDeliveriesPayload | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const loadInfo = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token || !matchId) return;
    const silent = opts?.silent === true;
    if (!silent) {
      setInfoRes({ loading: true, data: null, error: null });
    }
    try {
      const data = await apiFetch<MatchInfoPayload>(`/admin/cricket/matches/${encodeURIComponent(matchId)}/info`, {
        token,
      });
      setInfoRes({ loading: false, data, error: null });
    } catch (e) {
      if (!silent) {
        setInfoRes({
          loading: false,
          data: null,
          error: e instanceof ApiError ? e.message : "Failed to load match",
        });
      }
    }
  }, [token, matchId]);

  const loadDeliveries = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token || !matchId) return;
    const silent = opts?.silent === true;
    if (!silent) {
      setBallRes((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const data = await apiFetch<SyncedDeliveriesPayload>(
        `/admin/cricket/matches/${encodeURIComponent(matchId)}/synced-deliveries`,
        { token }
      );
      setBallRes({ loading: false, data, error: null });
    } catch (e) {
      if (!silent) {
        setBallRes({
          loading: false,
          data: null,
          error: e instanceof ApiError ? e.message : "Failed to load ball-by-ball",
        });
      } else {
        setBallRes((s) => ({ ...s, loading: false }));
      }
    }
  }, [token, matchId]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    if (!token || !seriesId) return;
    void (async () => {
      try {
        const r = await apiFetch<{ data?: { info?: { name?: string } } }>(
          `/admin/cricket/series/${encodeURIComponent(seriesId)}/info`,
          { token }
        );
        setSeriesTitle(r.data?.info?.name ?? null);
      } catch {
        setSeriesTitle(null);
      }
    })();
  }, [token, seriesId]);

  useEffect(() => {
    const i = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(i);
  }, []);

  const m = infoRes.data?.data;
  const scheduleUi = m ? getMatchScheduleUi(m, nowMs) : null;
  const phase = scheduleUi?.phase ?? "unknown";

  useEffect(() => {
    if (!token || !matchId) return;
    void loadDeliveries();
  }, [token, matchId, loadDeliveries]);

  useEffect(() => {
    if (phase !== "live" || !token || !matchId) return;
    const i = setInterval(() => {
      void loadInfo({ silent: true });
      void loadDeliveries({ silent: true });
    }, 15_000);
    return () => clearInterval(i);
  }, [phase, token, matchId, loadInfo, loadDeliveries]);

  useEffect(() => {
    if (tab !== "scorecard" || cardRes.loaded || cardRes.loading || !token || !matchId) return;
    void (async () => {
      setCardRes((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await apiFetch<ScorecardPayload>(
          `/admin/cricket/matches/${encodeURIComponent(matchId)}/scorecard`,
          { token }
        );
        setCardRes({ loading: false, data, error: null, loaded: true });
      } catch (e) {
        setCardRes({
          loading: false,
          data: null,
          error: e instanceof ApiError ? e.message : "Failed to load scorecard",
          loaded: true,
        });
      }
    })();
  }, [token, matchId, tab, cardRes.loaded, cardRes.loading]);

  const deliveries = ballRes.data?.deliveries ?? [];
  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [deliveries.length, phase]);

  if (!token) return <p className="text-zinc-500">Sign in to view this match.</p>;
  if (!matchId) return <p className="text-red-400">Missing match id.</p>;

  return (
    <div>
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
        <Link href="/leagues" className="text-sky-400 hover:text-sky-300">
          Leagues
        </Link>
        <span className="text-zinc-600">/</span>
        <Link
          href={`/leagues/cricket/${encodeURIComponent(seriesId)}`}
          className="max-w-[min(100%,280px)] truncate text-sky-400 hover:text-sky-300"
        >
          {seriesTitle ?? "Series"}
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300">Match</span>
      </nav>

      {infoRes.loading ? (
        <p className="text-zinc-500">Loading match…</p>
      ) : infoRes.error ? (
        <p className="text-red-400">{infoRes.error}</p>
      ) : m && scheduleUi ? (
        <>
          <div className={`mb-4 rounded-xl border border-zinc-800/80 p-4 ${scheduleUi.barClass}`}>
            <div className="flex flex-wrap items-center gap-3">
              <MatchStatusPill m={m} nowMs={nowMs} />
              <span className="text-xs text-zinc-500">
                Uses your clock vs <code className="text-zinc-600">dateTimeGMT</code> and provider flags (
                <code className="text-zinc-600">matchStarted</code>/<code className="text-zinc-600">matchEnded</code>
                ). Refreshes every 15s; live matches also refresh score and ball list.
              </span>
            </div>
          </div>

          <h1 className="mb-3 text-xl font-semibold leading-snug text-white">{m.name}</h1>

          <div className="mb-6 space-y-2 text-sm text-zinc-400">
            <p className="text-zinc-200">{m.status}</p>
            {m.venue && <p>{m.venue}</p>}
            {(m.date || m.dateTimeGMT) && (
              <p className="font-mono text-xs text-zinc-500">{m.dateTimeGMT ?? m.date}</p>
            )}
            {m.tossWinner && (
              <p>
                Toss: {m.tossWinner}
                {m.tossChoice ? ` · chose to ${m.tossChoice}` : ""}
              </p>
            )}
            {m.matchWinner && <p className="font-medium text-zinc-200">Winner: {m.matchWinner}</p>}
          </div>

          {m.score && m.score.length > 0 && (
            <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h2 className="mb-2 text-sm font-semibold text-zinc-300">Score</h2>
              <ul className="space-y-1.5 text-sm text-zinc-400">
                {m.score.map((s, i) => (
                  <li key={i}>
                    <span className="text-zinc-200">{s.inning}</span>: {s.r}/{s.w} ({s.o} ov)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="mb-8">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-300">Ball-by-ball</h2>
              {phase === "live" && (
                <span className="text-xs font-medium text-emerald-400/90">Auto-updating (live)</span>
              )}
            </div>
            <p className="mb-3 text-xs text-zinc-500">
              Fed from the cricket-data database when sync has written deliveries for this provider match id. Scroll
              for full history; newest balls appear at the bottom.
            </p>
            {ballRes.loading && deliveries.length === 0 ? (
              <p className="text-sm text-zinc-500">Loading deliveries…</p>
            ) : ballRes.error ? (
              <p className="text-sm text-red-400">{ballRes.error}</p>
            ) : ballRes.data?.ok === false ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
                {ballRes.data.message ??
                  "No local ball-by-ball yet. Ensure cricket-data sync has run for this match (live games ingest deltas into deliveries)."}
              </p>
            ) : deliveries.length === 0 ? (
              <p className="text-sm text-zinc-500">No deliveries stored for this match.</p>
            ) : (
              <div
                ref={feedScrollRef}
                className="max-h-[min(520px,60vh)] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60"
              >
                <ul className="divide-y divide-zinc-800/80 p-2">
                  {deliveries.map((d) => {
                    const runs = d.runsOffBat + d.extraRuns;
                    const w = d.wicketType ? ` W (${d.wicketType})` : "";
                    return (
                      <li key={d.id} className="px-2 py-2.5 text-sm">
                        <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-mono text-xs text-zinc-500">
                            Inn {d.inningsNumber} · {d.battingTeamShortName} · {d.over}.{d.ballInOver}
                          </span>
                          <span
                            className={`font-mono text-xs font-semibold ${
                              runs > 0 || d.wicketType ? "text-amber-200" : "text-zinc-500"
                            }`}
                          >
                            {runs > 0 ? `${runs} run${runs === 1 ? "" : "s"}` : "·"}{w}
                          </span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-zinc-300">{d.commentary}</p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          {d.bowlerName} → {d.batsmanName}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadDeliveries()}
              className="mt-3 text-xs font-medium text-sky-400 hover:text-sky-300"
            >
              Refresh ball list
            </button>
          </section>

          <div className="mb-4 flex gap-2 border-b border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setTab("summary")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === "summary" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/60"
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setTab("scorecard")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === "scorecard" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/60"
              }`}
            >
              Provider scorecard (JSON)
            </button>
          </div>

          {tab === "scorecard" && (
            <>
              {cardRes.loading && <p className="text-sm text-zinc-500">Loading scorecard…</p>}
              {cardRes.error && <p className="text-sm text-red-400">{cardRes.error}</p>}
              {!cardRes.loading && !cardRes.error && (
                <pre className="max-h-[70vh] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-emerald-200/90">
                  {JSON.stringify(cardRes.data?.data ?? cardRes.data, null, 2)}
                </pre>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
