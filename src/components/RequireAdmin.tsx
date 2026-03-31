"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { AdminShell } from "@/components/AdminShell";

type MeResponse = {
  user: { id: string; email: string; username: string; isAdmin: boolean };
};

export function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const [gate, setGate] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    if (!token) {
      setGate("fail");
      router.replace("/login");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch<MeResponse>("/auth/me", { token });
        if (cancelled) return;
        if (!res.user.isAdmin) {
          logout();
          setGate("fail");
          router.replace("/login");
          return;
        }
        setAuth(token, {
          id: res.user.id,
          email: res.user.email,
          username: res.user.username,
          isAdmin: res.user.isAdmin,
        });
        setGate("ok");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          logout();
        } else {
          logout();
        }
        setGate("fail");
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router, logout, setAuth]);

  if (gate !== "ok" || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        {gate === "loading" ? "Verifying session…" : "Redirecting…"}
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
