"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LockoutCountdown, isLocked } from "@/components/LockoutCountdown";
import { PageHeader } from "@/components/PageHeader";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { categories, upcomingEventSlugs } from "@/lib/mock-data";

type Profile = {
  id: string;
  display_name: string | null;
  garage_name: string | null;
  banner_colour: string | null;
  shield_base_colour: string | null;
  shield_pattern_colour: string | null;
  shield_pattern: string | null;
  shield_number: number | null;
};

type EventRow = {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
  lockout_at: string | null;
  manual_lock: boolean | null;
  is_open_event: boolean;
  sort_order: number;
  event_multiplier: number | null;
};

type PickRow = {
  category: string;
  driver_id: string;
  drivers?: {
    driver_name: string | null;
    team_name: string | null;
    car_number: string | null;
  } | null;
};

type TeamRow = {
  id: string;
  user_id: string;
  event_id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  submitted_at: string | null;
  locked_at?: string | null;
  score_published_at?: string | null;
  fantasy_team_picks?: PickRow[];
};

type ScoreRow = {
  user_id: string;
  event_id: string;
  fantasy_team_id?: string | null;
  published_score: number | null;
  normalised_event_score: number | null;
  raw_team_score?: number | null;
  regular_points?: number | null;
  captain_points?: number | null;
  vice_captain_points?: number | null;
  event_multiplier?: number | null;
  picks_count?: number | null;
  calculated_at?: string | null;
};

type PickScoreRow = {
  event_id: string;
  fantasy_team_id: string;
  category: string;
  driver_id: string;
  driver_name: string;
  team_name: string;
  car_number: string;
  base_driver_score: number;
  captain_multiplier: number;
  multiplied_driver_score: number;
  final_driver_score: number;
  is_captain: boolean;
  is_vice_captain: boolean;
};

type RankRow = {
  user_id: string;
  event_id: string;
  published_score: number | null;
};

function formatPoints(value: number | null | undefined) {
  return Math.round(Number(value ?? 0) * 10) / 10;
}

function eventStatus(event: EventRow, team: TeamRow | undefined, score: ScoreRow | undefined, now: number) {
  if (score) return "Scored";
  if (event.is_open_event && !isLocked(event.lockout_at, event.manual_lock, now)) {
    return team ? "Open · team saved" : "Open · pick team";
  }
  if (team) return "Locked";
  if (isLocked(event.lockout_at, event.manual_lock, now)) return "Missed";
  return "Upcoming";
}

export default function TeamHistoryPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [pickScores, setPickScores] = useState<PickScoreRow[]>([]);
  const [allScores, setAllScores] = useState<RankRow[]>([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          window.location.href = "/login";
          return;
        }

        setUserId(authData.user.id);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("id,display_name,garage_name,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number")
          .eq("id", authData.user.id)
          .maybeSingle();

        setProfile(profileData as Profile | null);

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id,slug,name,full_name,lockout_at,manual_lock,is_open_event,sort_order,event_multiplier")
          .in("slug", [...upcomingEventSlugs])
          .order("sort_order");

        if (eventError) throw eventError;

        const eventRows = (eventData ?? []) as EventRow[];
        setEvents(eventRows);
        setActiveEventId(eventRows.find((event) => event.is_open_event)?.id ?? eventRows[0]?.id ?? "");

        const { data: teamData, error: teamError } = await supabase
          .from("fantasy_teams")
          .select("id,user_id,event_id,captain_driver_id,vice_captain_driver_id,submitted_at,locked_at,score_published_at,fantasy_team_picks(category,driver_id,drivers(driver_name,team_name,car_number))")
          .eq("user_id", authData.user.id);

        if (teamError) throw teamError;
        setTeams((teamData ?? []) as unknown as TeamRow[]);

        const { data: scoreData, error: scoreError } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,fantasy_team_id,published_score,normalised_event_score,raw_team_score,regular_points,captain_points,vice_captain_points,event_multiplier,picks_count,calculated_at")
          .eq("user_id", authData.user.id);

        if (scoreError) throw scoreError;
        setScores((scoreData ?? []) as ScoreRow[]);

        const { data: pickScoreData, error: pickScoreError } = await supabase
          .from("fantasy_pick_scores")
          .select("event_id,fantasy_team_id,category,driver_id,driver_name,team_name,car_number,base_driver_score,captain_multiplier,multiplied_driver_score,final_driver_score,is_captain,is_vice_captain")
          .eq("user_id", authData.user.id);

        if (pickScoreError) throw pickScoreError;
        setPickScores((pickScoreData ?? []) as PickScoreRow[]);

        const { data: allScoreData } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,published_score");

        setAllScores((allScoreData ?? []) as RankRow[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load team history.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  const currentEventIds = useMemo(() => new Set(events.map((event) => event.id)), [events]);
  const currentTeams = useMemo(() => teams.filter((team) => currentEventIds.has(team.event_id)), [teams, currentEventIds]);
  const currentScores = useMemo(() => scores.filter((score) => currentEventIds.has(score.event_id)), [scores, currentEventIds]);

  const selectedEvent = events.find((event) => event.id === activeEventId) ?? events[0];
  const selectedTeam = currentTeams.find((team) => team.event_id === selectedEvent?.id);
  const selectedScore = currentScores.find((score) => score.event_id === selectedEvent?.id);
  const selectedPickScores = pickScores
    .filter((score) => score.event_id === selectedEvent?.id)
    .sort((a, b) => a.category.localeCompare(b.category));

  const statSummary = useMemo(() => {
    const published = currentScores.filter((score) => Number(score.published_score ?? 0) > 0);
    const totalPoints = currentScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);
    const eventsPlayed = currentTeams.length;
    const scoredEvents = published.length;
    const average = scoredEvents ? totalPoints / scoredEvents : 0;
    const captainPoints = currentScores.reduce((sum, score) => sum + Number(score.captain_points ?? 0), 0);
    const vicePoints = currentScores.reduce((sum, score) => sum + Number(score.vice_captain_points ?? 0), 0);

    const best = published.reduce<ScoreRow | null>((current, score) => {
      if (!current || Number(score.published_score ?? 0) > Number(current.published_score ?? 0)) return score;
      return current;
    }, null);

    const worst = published.reduce<ScoreRow | null>((current, score) => {
      if (!current || Number(score.published_score ?? 0) < Number(current.published_score ?? 0)) return score;
      return current;
    }, null);

    const totalsByUser: Record<string, number> = {};
    for (const score of allScores) {
      if (!currentEventIds.has(score.event_id)) continue;
      totalsByUser[score.user_id] = (totalsByUser[score.user_id] ?? 0) + Number(score.published_score ?? 0);
    }

    const sortedTotals = Object.entries(totalsByUser).sort((a, b) => b[1] - a[1]);
    const rank = sortedTotals.findIndex(([id]) => id === userId) + 1;

    return { totalPoints, eventsPlayed, scoredEvents, average, captainPoints, vicePoints, best, worst, rank };
  }, [currentScores, currentTeams.length, allScores, currentEventIds, userId]);

  function eventName(eventId: string | null | undefined) {
    return events.find((event) => event.id === eventId)?.name ?? "—";
  }

  if (loading) {
    return <div className="card">Loading your team history...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Team" title="Team history and points">
        Saved teams, captaincy and points by event.
      </PageHeader>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      {profile ? (
        <section className="card" style={{ background: profile.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}22, rgba(17,24,39,.86))` : undefined }}>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <Shield
                number={profile.shield_number ?? 88}
                baseColour={profile.shield_base_colour ?? "#ff7a1a"}
                patternColour={profile.shield_pattern_colour ?? "#111827"}
                pattern={profile.shield_pattern ?? "chevron"}
                size={64}
              />
              <div>
                <div className="pill mb-2">{profile.display_name ?? "Manager"}</div>
                <h2 className="text-2xl font-black sm:text-3xl">{profile.garage_name ?? "Your Garage"}</h2>
                <p className="text-track-muted">Overall rank: {statSummary.rank ? `#${statSummary.rank}` : "not ranked yet"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="btn btn-primary" href="/pick-team">Pick current team</Link>
              <Link className="btn" href="/leaderboard">View leaderboard</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5"><div className="text-xs font-black text-track-muted sm:text-sm">Total points</div><div className="mt-1 text-2xl font-black sm:text-4xl">{formatPoints(statSummary.totalPoints)}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5"><div className="text-xs font-black text-track-muted sm:text-sm">Events played</div><div className="mt-1 text-2xl font-black sm:text-4xl">{statSummary.eventsPlayed}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5"><div className="text-xs font-black text-track-muted sm:text-sm">Average</div><div className="mt-1 text-2xl font-black sm:text-4xl">{formatPoints(statSummary.average)}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5"><div className="text-xs font-black text-track-muted sm:text-sm">C / VC points</div><div className="mt-1 text-xl font-black sm:text-3xl">{formatPoints(statSummary.captainPoints)} / {formatPoints(statSummary.vicePoints)}</div></div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-black text-track-muted">Best event</div>
          <div className="mt-1 text-xl font-black">{statSummary.best ? eventName(statSummary.best.event_id) : "Awaiting scores"}</div>
          <p className="mt-1 text-sm text-track-muted">{statSummary.best ? `${formatPoints(statSummary.best.published_score)} pts` : "No scored events yet."}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-black text-track-muted">Lowest scored event</div>
          <div className="mt-1 text-xl font-black">{statSummary.worst ? eventName(statSummary.worst.event_id) : "Awaiting scores"}</div>
          <p className="mt-1 text-sm text-track-muted">{statSummary.worst ? `${formatPoints(statSummary.worst.published_score)} pts` : "This appears once you have scored events."}</p>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-black">Event history</h2>
            <p className="text-sm text-track-muted">View saved teams, locked teams and published points round by round.</p>
          </div>
          {selectedEvent ? <LockoutCountdown lockoutAt={selectedEvent.lockout_at} manualLock={selectedEvent.manual_lock} /> : null}
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {events.map((event) => {
            const team = currentTeams.find((item) => item.event_id === event.id);
            const score = currentScores.find((item) => item.event_id === event.id);
            const status = eventStatus(event, team, score, now);
            return (
              <button
                key={event.id}
                className={`min-w-[145px] rounded-2xl border px-4 py-3 text-left ${activeEventId === event.id ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`}
                onClick={() => setActiveEventId(event.id)}
              >
                <div className="font-black">{event.name}</div>
                <div className="mt-1 text-xs text-track-muted">{status}</div>
                <div className="mt-1 text-xs font-bold">
                  {score ? `${formatPoints(score.published_score)} pts` : team ? "Team saved" : "0 pts"}
                </div>
              </button>
            );
          })}
        </div>

        {selectedEvent ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-3 sm:p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <div className="pill mb-2">{eventStatus(selectedEvent, selectedTeam, selectedScore, now)}</div>
                <h3 className="text-2xl font-black sm:text-3xl">{selectedEvent.name}</h3>
                <p className="mt-1 text-track-muted">
                  {selectedScore
                    ? `Published score: ${formatPoints(selectedScore.published_score)} pts`
                    : selectedTeam
                      ? "Team saved. Waiting for Race Control to publish scores."
                      : "No team selected for this event. Score: 0 pts."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedEvent.is_open_event && !isLocked(selectedEvent.lockout_at, selectedEvent.manual_lock, now) ? (
                  <Link className="btn btn-primary" href="/pick-team">Edit Team</Link>
                ) : selectedTeam ? (
                  <span className="pill">Team locked / view only</span>
                ) : (
                  <span className="pill">No selection</span>
                )}
              </div>
            </div>

            {selectedScore ? (
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-2xl bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Base</div><div className="text-xl font-black sm:text-2xl">{formatPoints(selectedScore.regular_points)}</div></div>
                <div className="rounded-2xl bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Captain</div><div className="text-xl font-black sm:text-2xl">{formatPoints(selectedScore.captain_points)}</div></div>
                <div className="rounded-2xl bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Vice</div><div className="text-xl font-black sm:text-2xl">{formatPoints(selectedScore.vice_captain_points)}</div></div>
                <div className="rounded-2xl bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Multi</div><div className="text-xl font-black sm:text-2xl">{Number(selectedScore.event_multiplier ?? selectedEvent.event_multiplier ?? 1)}x</div></div>
              </div>
            ) : null}

            <div className="mt-5 space-y-2">
              {selectedPickScores.length ? selectedPickScores.map((pick) => (
                <div key={pick.category} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black/30 px-2 py-1 text-xs font-black">Cat {pick.category}</span>
                        {pick.is_captain ? <span className="pill">C 2x</span> : pick.is_vice_captain ? <span className="pill">VC 1.5x</span> : null}
                      </div>
                      <div className="mt-2 truncate font-black">#{pick.car_number} {pick.driver_name}</div>
                      <div className="truncate text-xs text-track-muted">{pick.team_name}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-track-muted">Final</div>
                      <div className="text-xl font-black">{formatPoints(pick.final_driver_score)}</div>
                      <div className="text-[11px] text-track-muted">Base {formatPoints(pick.base_driver_score)}</div>
                    </div>
                  </div>
                </div>
              )) : selectedTeam?.fantasy_team_picks?.length ? (
                [...selectedTeam.fantasy_team_picks].sort((a, b) => a.category.localeCompare(b.category)).map((pick) => (
                  <div key={pick.category} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-black/30 px-2 py-1 text-xs font-black">Cat {pick.category}</span>
                          {pick.driver_id === selectedTeam.captain_driver_id ? <span className="pill">C 2x</span> : null}
                          {pick.driver_id === selectedTeam.vice_captain_driver_id ? <span className="pill">VC 1.5x</span> : null}
                        </div>
                        <div className="mt-2 truncate font-black">#{pick.drivers?.car_number} {pick.drivers?.driver_name}</div>
                        <div className="truncate text-xs text-track-muted">{pick.drivers?.team_name}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                categories.map((category) => (
                  <div key={category} className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-sm text-track-muted">
                    Category {category}: no driver selected
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
