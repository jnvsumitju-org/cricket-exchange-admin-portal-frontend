/** Match list / match_info fields used for schedule UI. */
export type CricketMatchScheduleFields = {
  dateTimeGMT?: string;
  date?: string;
  matchStarted?: boolean;
  matchEnded?: boolean;
  status?: string;
};

export type MatchSchedulePhase =
  | "live"
  | "completed"
  | "upcoming_soon"
  | "upcoming"
  | "delayed"
  | "unknown";

const SOON_WINDOW_MS = 4 * 60 * 60 * 1000;
const DELAY_GRACE_MS = 45 * 60 * 1000;

function parseStartMs(m: CricketMatchScheduleFields): number | null {
  const raw = m.dateTimeGMT ?? m.date;
  if (!raw || typeof raw !== "string") return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

function inferCompleted(m: CricketMatchScheduleFields): boolean {
  if (m.matchEnded === true) return true;
  const s = (m.status ?? "").toLowerCase();
  return (
    /\b(won by|won\s+by|tied|abandoned|no result|match drawn|match tied|won the match)\b/.test(s) ||
    /\b(inning[s]?\s+1\s+and\s+2?\s+completed)\b/.test(s)
  );
}

function inferLive(m: CricketMatchScheduleFields, completed: boolean): boolean {
  return m.matchStarted === true && !completed;
}

/**
 * Classify a fixture for badges and banners using provider flags, status text, and wall-clock vs scheduled start.
 */
export function getMatchScheduleUi(
  m: CricketMatchScheduleFields,
  nowMs: number = Date.now()
): {
  phase: MatchSchedulePhase;
  label: string;
  pillClass: string;
  barClass: string;
} {
  const completed = inferCompleted(m);
  if (completed) {
    return {
      phase: "completed",
      label: "Finished",
      pillClass: "bg-zinc-700/80 text-zinc-200 ring-1 ring-zinc-600",
      barClass: "border-l-4 border-zinc-500 bg-zinc-900/60",
    };
  }

  const live = inferLive(m, completed);
  if (live) {
    return {
      phase: "live",
      label: "Live",
      pillClass: "bg-emerald-600/90 text-white ring-1 ring-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
      barClass: "border-l-4 border-emerald-500 bg-emerald-950/35",
    };
  }

  const startMs = parseStartMs(m);
  if (startMs == null) {
    return {
      phase: "unknown",
      label: "Schedule TBC",
      pillClass: "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700",
      barClass: "border-l-4 border-zinc-600 bg-zinc-900/40",
    };
  }

  if (nowMs < startMs) {
    const until = startMs - nowMs;
    if (until <= SOON_WINDOW_MS) {
      return {
        phase: "upcoming_soon",
        label: "Starting soon",
        pillClass: "bg-amber-600/85 text-amber-50 ring-1 ring-amber-400/40",
        barClass: "border-l-4 border-amber-500 bg-amber-950/30",
      };
    }
    return {
      phase: "upcoming",
      label: "Upcoming",
      pillClass: "bg-sky-700/80 text-sky-100 ring-1 ring-sky-500/40",
      barClass: "border-l-4 border-sky-500 bg-sky-950/25",
    };
  }

  if (nowMs >= startMs + DELAY_GRACE_MS && m.matchStarted !== true) {
    return {
      phase: "delayed",
      label: "Delayed / pre-start",
      pillClass: "bg-orange-700/80 text-orange-50 ring-1 ring-orange-500/40",
      barClass: "border-l-4 border-orange-500 bg-orange-950/30",
    };
  }

  return {
    phase: "upcoming_soon",
    label: "About to start",
    pillClass: "bg-amber-600/85 text-amber-50 ring-1 ring-amber-400/40",
    barClass: "border-l-4 border-amber-500 bg-amber-950/30",
  };
}

export function MatchStatusPill({ m, nowMs }: { m: CricketMatchScheduleFields; nowMs?: number }) {
  const ui = getMatchScheduleUi(m, nowMs);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ui.pillClass}`}>
      {ui.label}
    </span>
  );
}
