"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type LeagueRow = {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
};

export default function AdminLeaguesPage() {
  const token = useAuthStore((s) => s.token);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{ leagues: LeagueRow[] }>("/leagues", { token });
        setLeagues(res.leagues);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load leagues");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (loading) return <p className="text-zinc-500">Loading leagues…</p>;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">Leagues</h1>
      <p className="mb-6 text-sm text-zinc-500">League id and slug for support and debugging.</p>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Id</th>
              <th className="px-3 py-2 font-medium">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {leagues.map((l) => (
              <tr key={l.id} className="text-zinc-300">
                <td className="px-3 py-2 text-zinc-100">{l.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-400">{l.slug}</td>
                <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-zinc-500">{l.id}</td>
                <td className="px-3 py-2 tabular-nums">{l.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
