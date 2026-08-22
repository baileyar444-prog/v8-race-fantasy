"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { upcomingEventSlugs } from "@/lib/mock-data";
import { isLocked } from "@/components/LockoutCountdown";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
  lockout_at: string | null;
  manual_lock: boolean | null;
  is_open_event: boolean;
  sort_order: number;
};

type ScoreRow = {
  user_id: string;
  event_id: string;
  published_score: number | null;
};

type TeamRow = {
  id: string;
  event_id: string;
};

function points(value: number | null | undefined) {
  return Math.round(Number(value ?? 0) * 10) / 10;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "locked";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function rankForEvent(scores: ScoreRow[], eventId: string, userId: string) {
  const ranked = scores
    .filter((score) => score.event_id === eventId && score.published_score !== null)
    .map((score) => ({
      userId: score.user_id,
      score: Number(score.published_score ?? 0)
    }))
    .sort((a, b) => b.score - a.score);

  const index = ranked.findIndex((row) => row.userId === userId);
  return index >= 0 ? index + 1 : null;
}

function overallRank(scores: ScoreRow[], eventIds: Set<string>, userId: string) {
  const totals = new Map<string, number>();

  for (const score of scores) {
    if (!eventIds.has(score.event_id)) continue;
    totals.set(score.user_id, (totals.get(score.user_id) ?? 0) + Number(score.published_score ?? 0));
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const index = ranked.findIndex(([id]) => id === userId);
  return index >= 0 ? index + 1 : null;
}

export function RoundStatusBanner() {
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          setLoaded(true);
          return;
        }

        setUserId(authData.user.id);

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id,slug,name,full_name,lockout_at,manual_lock,is_open_event,sort_order")
          .in("slug", [...upcomingEventSlugs])
          .order("sort_order");

        if (eventError) throw eventError;

        const eventRows = (eventData ?? []) as EventRow[];
        setEvents(eventRows);

        const { data: scoreData, error: scoreError } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,published_score");

        if (scoreError) throw scoreError;
        setScores((scoreData ?? []) as ScoreRow[]);

        const openEvent = eventRows.find((event) => event.is_open_event) ?? eventRows.find((event) => !isLocked(event.lockout_at, event.manual_lock)) ?? eventRows[0];

        if (openEvent) {
          const { data: teamData } = await supabase
            .from("fantasy_teams")
            .select("id,event_id")
            .eq("user_id", authData.user.id)
            .eq("event_id", openEvent.id);

          setTeams((teamData ?? []) as TeamRow[]);
        }
      } catch {
        // Keep the banner silent rather than blocking the site.
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, [supabase]);

  const eventIds = useMemo(() => new Set(events.map((event) => event.id)), [events]);
  const openEvent = events.find((event) => event.is_open_event) ?? events.find((event) => !isLocked(event.lockout_at, event.manual_lock, now)) ?? null;
  const userScores = scores.filter((score) => score.user_id === userId && eventIds.has(score.event_id));

  const lastScored = userScores
    .map((score) => ({
      score,
      event: events.find((event) => event.id === score.event_id) ?? null
    }))
    .filter((item) => item.event && item.score.published_score !== null)
    .sort((a, b) => (b.event?.sort_order ?? 0) - (a.event?.sort_order ?? 0))[0] ?? null;

  const lastRoundRank = lastScored?.event ? rankForEvent(scores, lastScored.event.id, userId) : null;
  const myOverallRank = overallRank(scores, eventIds, userId);
  const openTeamSaved = Boolean(openEvent && teams.some((team) => team.event_id === openEvent.id));
  const locked = isLocked(openEvent?.lockout_at, openEvent?.manual_lock, now);
  const countdown = openEvent?.manual_lock ? "manual lock" : openEvent?.lockout_at ? formatDuration(new Date(openEvent.lockout_at).getTime() - now) : "TBC";

  if (!loaded || !userId || !openEvent) return null;

  return (
    <div className="border-b border-white/10 bg-[#111827]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 py-1 sm:px-5 sm:py-3">
        <div className="rounded-xl border border-track-orange/20 bg-black/25 px-2 py-1.5 shadow-glow sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-black">
                {lastScored?.event ? `${lastScored.event.name}: ${points(lastScored.score.published_score)} pts` : "Awaiting score"}
                {myOverallRank ? ` · Overall #${myOverallRank}` : ""}
              </div>
              <div className="truncate text-[10px] font-bold text-track-muted">
                {openTeamSaved ? `${openEvent.name} saved` : `Pick ${openEvent.name}`} · {locked ? "Locked" : `Locks ${countdown}`}
              </div>
            </div>
            <Link className="shrink-0 rounded-full bg-track-orange px-3 py-1.5 text-[11px] font-black text-black" href="/pick-team">
              {openTeamSaved ? "Edit" : "Pick"}
            </Link>
          </div>
        </div>

        <div className="hidden flex-col gap-2 rounded-3xl border border-track-orange/25 bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,.22),rgba(255,255,255,.05)_35%,rgba(0,0,0,.18))] px-4 py-3 shadow-glow sm:flex lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-black/25 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-track-muted">Last round</div>
              <div className="truncate text-lg font-black">
                {lastScored?.event ? `${lastScored.event.name}: ${points(lastScored.score.published_score)} pts` : "Awaiting first score"}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-track-muted">Rank</div>
              <div className="truncate text-sm font-black">
                {lastRoundRank ? `Round #${lastRoundRank}` : "Round —"} {myOverallRank ? `· Overall #${myOverallRank}` : ""}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-track-muted">Next up</div>
              <div className="truncate text-sm font-black">
                {openTeamSaved ? `${openEvent.name} team saved` : `Pick your ${openEvent.name} team`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className={`pill ${locked ? "border-red-400/30 bg-red-500/10 text-red-100" : ""}`}>
              {locked ? "Locked" : "Locks in"} {countdown}
            </span>
            <Link className="btn btn-primary px-4 py-2 text-sm" href="/pick-team">
              {openTeamSaved ? "Edit team" : "Pick team"}
            </Link>
            <Link className="btn px-4 py-2 text-sm" href="/leaderboard">
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
