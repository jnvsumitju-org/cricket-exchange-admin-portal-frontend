"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useAuthStore } from "@/store/authStore";

type UserRow = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isTreasury: boolean;
  isAdmin: boolean;
  isSuspended: boolean;
  balance: string | null;
  reservedBalance: string | null;
};

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  users: UserRow[];
};

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const q = new URLSearchParams({ page: String(page), pageSize: "20" });
        const res = await apiFetch<ListResponse>(`/admin/users?${q}`, { token });
        setData(res);
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError("Failed to load users");
      }
    })();
  }, [token, page]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-zinc-500">Loading users…</p>;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <button
          type="button"
          onClick={() => {
            const rows: string[][] = [
              ["id", "email", "username", "isTreasury", "isAdmin", "isSuspended", "balance", "reserved", "createdAt"],
              ...data.users.map((u) => [
                u.id,
                u.email,
                u.username,
                String(u.isTreasury),
                String(u.isAdmin),
                String(u.isSuspended),
                u.balance ?? "",
                u.reservedBalance ?? "",
                u.createdAt,
              ]),
            ];
            downloadCsv(`users-page-${data.page}.csv`, rows);
          }}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Download CSV (this page)
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Username</th>
              <th className="px-3 py-2 font-medium">Balance</th>
              <th className="px-3 py-2 font-medium">Reserved</th>
              <th className="px-3 py-2 font-medium">Flags</th>
              <th className="px-3 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.users.map((u) => (
              <tr key={u.id} className="text-zinc-300">
                <td className="px-3 py-2 text-zinc-100">
                  <Link href={`/users/${u.id}`} className="text-emerald-400 hover:text-emerald-300 hover:underline">
                    {u.email}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/users/${u.id}`} className="text-zinc-300 hover:text-white hover:underline">
                    {u.username}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">{u.balance ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{u.reservedBalance ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {u.isTreasury ? (
                    <span className="mr-1 rounded bg-amber-900/50 px-1.5 py-0.5 text-amber-200">treasury</span>
                  ) : null}
                  {u.isAdmin ? (
                    <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-emerald-200">admin</span>
                  ) : null}
                  {u.isSuspended ? (
                    <span className="ml-1 rounded bg-rose-900/50 px-1.5 py-0.5 text-rose-200">suspended</span>
                  ) : null}
                  {!u.isTreasury && !u.isAdmin && !u.isSuspended ? <span className="text-zinc-600">—</span> : null}
                </td>
                <td className="px-3 py-2 text-zinc-500">{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Page {data.page} of {totalPages} ({data.total} users)
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
