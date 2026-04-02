"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { MatchStatusPill } from "@/lib/cricketMatchSchedule";
import { useAuthStore } from "@/store/authStore";

type SeriesInfoBlock = {
  id: string;
  name: string;
  startdate: string;
  enddate: string;
  odi: number;
  t20: number;
  test: number;
  squads: number;
  matches: number;
};

type MatchListItem = {
  id: string;
  name: string;
  matchType?: string;
  status: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  matchStarted?: boolean;
  matchEnded?: boolean;
};

type SeriesInfoPayload = {
  data?: {
    info?: SeriesInfoBlock;
    matchList?: MatchListItem[];
  };
};

type PointRow = {
  teamname: string;
  shortname?: string;
  matches: number;
  wins: number;
  loss: number;
  ties: number;
  nr: number;
};

type PointsPayload = { data?: PointRow[] };

type SquadPlayer = {
  id: string;
  name: string;
  role?: string;
  country?: string;
};

type SquadTeam = {
  teamName: string;
  shortname?: string;
  players: SquadPlayer[];
};

type SquadsPayload = { data?: SquadTeam[] };

type Tab = "fixtures" | "points" | "squads";

export default function AdminCricketSeriesDetailPage() {
  const params = useParams();
  const seriesId = typeof params.seriesId === "string" ? params.seriesId : "";
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>("fixtures");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  const [infoRes, setInfoRes] = useState<{
    loading: boolean;
    data: SeriesInfoPayload | null;
    error: string | null;
  }>({ loading: true, data: null, error: null });

  const [pointsRes, setPointsRes] = useState<{
    loading: boolean;
    data: PointsPayload | null;
    error: string | null;
    loaded: boolean;
  }>({ loading: false, data: null, error: null, loaded: false });

  const [squadsRes, setSquadsRes] = useState<{
    loading: boolean;
    data: SquadsPayload | null;
    error: string | null;
    loaded: boolean;
  }>({ loading: false, data: null, error: null, loaded: false });

  const loadInfo = useCallback(async () => {
    if (!token || !seriesId) return;
    setInfoRes({ loading: true, data: null, error: null });
    try {
      const data = await apiFetch<SeriesInfoPayload>(
        `/admin/cricket/series/${encodeURIComponent(seriesId)}/info`,
        { token }
      );
      setInfoRes({ loading: false, data, error: null });
    } catch (e) {
      setInfoRes({
        loading: false,
        data: null,
        error: e instanceof ApiError ? e.message : "Failed to load series",
      });
    }
  }, [token, seriesId]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    if (!token || !seriesId || tab !== "points" || pointsRes.loaded || pointsRes.loading) return;
    void (async () => {
      setPointsRes((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await apiFetch<PointsPayload>(
          `/admin/cricket/series/${encodeURIComponent(seriesId)}/points`,
          { token }
        );
        setPointsRes({ loading: false, data, error: null, loaded: true });
      } catch (e) {
        setPointsRes({
          loading: false,
          data: null,
          error: e instanceof ApiError ? e.message : "Failed to load points",
          loaded: true,
        });
      }
    })();
  }, [token, seriesId, tab, pointsRes.loaded, pointsRes.loading]);

  useEffect(() => {
    if (!token || !seriesId || tab !== "squads" || squadsRes.loaded || squadsRes.loading) return;
    void (async () => {
      setSquadsRes((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await apiFetch<SquadsPayload>(
          `/admin/cricket/series/${encodeURIComponent(seriesId)}/squads`,
          { token }
        );
        setSquadsRes({ loading: false, data, error: null, loaded: true });
      } catch (e) {
        setSquadsRes({
          loading: false,
          data: null,
          error: e instanceof ApiError ? e.message : "Failed to load squads",
          loaded: true,
        });
      }
    })();
  }, [token, seriesId, tab, squadsRes.loaded, squadsRes.loading]);

  if (!token) return <p className="text-zinc-500">Sign in to view this series.</p>;
  if (!seriesId) return <p className="text-red-400">Missing series id.</p>;

  const info = infoRes.data?.data?.info;
  const matchList = infoRes.data?.data?.matchList ?? [];

  return (
    <div>
      <p className="mb-4">
        <Link href="/leagues" className="text-sm text-sky-400 hover:text-sky-300">
          ← Leagues
        </Link>
      </p>

      {infoRes.loading ? (
        <p className="text-zinc-500">Loading series…</p>
      ) : infoRes.error ? (
        <p className="text-red-400">{infoRes.error}</p>
      ) : (
        <>
          <h1 className="mb-1 text-xl font-semibold text-white">{info?.name ?? "Series"}</h1>
          {info && (
            <p className="mb-6 text-sm text-zinc-500">
              {info.startdate} → {info.enddate} · T20 {info.t20} · ODI {info.odi} · Test {info.test} · {info.matches}{" "}
              matches
            </p>
          )}

          <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
            {(["fixtures", "points", "squads"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${
                  tab === t ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                {t === "fixtures" ? "Fixtures & results" : t}
              </button>
            ))}
          </div>

          {tab === "fixtures" && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Match</th>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Venue</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {matchList.map((m) => (
                    <tr key={m.id} className="text-zinc-300">
                      <td className="px-3 py-2 text-zinc-100">{m.name}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-400">
                        {m.dateTimeGMT ?? m.date ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-zinc-400">{m.venue ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1.5">
                          <MatchStatusPill m={m} nowMs={nowMs} />
                          <span className="max-w-[220px] text-[11px] leading-snug text-zinc-500">{m.status}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/leagues/cricket/${encodeURIComponent(seriesId)}/match/${encodeURIComponent(m.id)}`}
                          className="text-sm font-medium text-sky-400 hover:text-sky-300"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {matchList.length === 0 && <p className="p-4 text-sm text-zinc-500">No matches in response.</p>}
            </div>
          )}

          {tab === "points" && (
            <>
              {pointsRes.loading && <p className="text-sm text-zinc-500">Loading points table…</p>}
              {pointsRes.error && <p className="text-sm text-red-400">{pointsRes.error}</p>}
              {!pointsRes.loading && !pointsRes.error && (
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Team</th>
                        <th className="px-3 py-2 font-medium">M</th>
                        <th className="px-3 py-2 font-medium">W</th>
                        <th className="px-3 py-2 font-medium">L</th>
                        <th className="px-3 py-2 font-medium">T</th>
                        <th className="px-3 py-2 font-medium">NR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {(pointsRes.data?.data ?? []).map((row, i) => (
                        <tr key={`${row.teamname}-${i}`} className="text-zinc-300">
                          <td className="px-3 py-2 text-zinc-100">{row.teamname}</td>
                          <td className="px-3 py-2 tabular-nums">{row.matches}</td>
                          <td className="px-3 py-2 tabular-nums">{row.wins}</td>
                          <td className="px-3 py-2 tabular-nums">{row.loss}</td>
                          <td className="px-3 py-2 tabular-nums">{row.ties}</td>
                          <td className="px-3 py-2 tabular-nums">{row.nr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "squads" && (
            <>
              {squadsRes.loading && <p className="text-sm text-zinc-500">Loading squads…</p>}
              {squadsRes.error && <p className="text-sm text-red-400">{squadsRes.error}</p>}
              {!squadsRes.loading && !squadsRes.error && (
                <div className="space-y-4">
                  {(squadsRes.data?.data ?? []).map((team) => (
                    <details
                      key={team.teamName}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 open:bg-zinc-900/60"
                    >
                      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-100">
                        {team.teamName}
                        {team.shortname ? (
                          <span className="ml-2 font-mono text-xs text-zinc-500">{team.shortname}</span>
                        ) : null}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          ({team.players?.length ?? 0} players)
                        </span>
                      </summary>
                      <ul className="border-t border-zinc-800 px-4 py-2 text-sm text-zinc-400">
                        {(team.players ?? []).map((p) => (
                          <li key={p.id} className="py-1">
                            <span className="text-zinc-200">{p.name}</span>
                            {p.role ? <span className="ml-2 text-xs text-zinc-500">{p.role}</span> : null}
                            {p.country ? <span className="ml-2 text-xs text-zinc-600">{p.country}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                  {(squadsRes.data?.data ?? []).length === 0 && (
                    <p className="text-sm text-zinc-500">No squad data.</p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
