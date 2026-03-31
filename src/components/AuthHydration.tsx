"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

export function AuthHydration({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
