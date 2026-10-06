"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { isLocked } from "@/components/LockoutCountdown";
import { PageHeader } from "@/components/PageHeader";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { categories, upcomingEventSlugs } from "@/lib/mock-data";
import { friendlyDataError } from "@/lib/friendly-error";

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
  number_of_races?: number | null;
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
  status?: string | null;
  source_event_id?: string | null;
  source_event_name?: string | null;
  carried_forward_at?: string | null;
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
  status?: string | null;
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

type RaceResultRow = {
  event_id: string;
  race_number: number;
  driver_id: string;
  qualifying_position: number | null;
  finish_position: number | null;
  classification: string | null;
  race_fantasy_points: number | null;
};

type RankRow = {
  user_id: string;
  event_id: string;
  published_score: number | null;
};

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1);
}

function qualifyingPoints(position?: number | null) {
  if (!position || position < 1) return 0;
  if (position === 1) return 20;
  if (position === 2) return 17;
  if (position === 3) return 15;
  if (position === 4) return 13;
  if (position === 5) return 11;
  if (position >= 6 && position <= 10) return 16 - position;
  if (position >= 11 && position <= 15) return 16 - position;
  return 0;
}

function finishPoints(position?: number | null) {
  if (!position || position < 1) return 0;
  const table: Record<number, number> = {
    1: 60, 2: 54, 3: 49, 4: 45, 5: 41, 6: 38, 7: 35, 8: 32, 9: 29, 10: 26,
    11: 24, 12: 22, 13: 20, 14: 18, 15: 16, 16: 14, 17: 12, 18: 10, 19: 8, 20: 6,
    21: 5, 22: 4, 23: 3, 24: 2, 25: 1, 26: 1, 27: 1
  };
  return table[position] ?? 0;
}

function classificationAdjustment(classification?: string | null) {
  if (classification === "dnf") return -10;
  if (classification === "dns") return -15;
  if (classification === "dsq") return -25;
  return 0;
}

function racePointsOnly(result: RaceResultRow | undefined) {
  if (!result) return 0;
  if (result.classification === "dns" || result.classification === "dsq") return classificationAdjustment(result.classification);
  return finishPoints(result.finish_position) + classificationAdjustment(result.classification);
}

function positionLabel(position?: number | null, classification?: string | null) {
  if (classification === "dns") return "DNS";
  if (classification === "dsq") return "DSQ";
  if (classification === "dnf" && !position) return "DNF";
  if (!position) return "—";
  return `P${position}${classification === "dnf" ? " DNF" : ""}`;
}

function eventStatus(event: EventRow, team: TeamRow | undefined, score: ScoreRow | undefined, now: number) {
  if (score?.status === "baseline") return "Baseline";
  if (score?.status === "carried_forward" || team?.status === "carried_forward") return "Continued";
  if (score) return "Scored";
  if (event.is_open_event && !isLocked(event.lockout_at, event.manual_lock, now)) return team ? "Open · saved" : "Open · pick";
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
  const [raceResults, setRaceResults] = useState<RaceResultRow[]>([]);
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
          .select("id,slug,name,full_name,lockout_at,manual_lock,is_open_event,sort_order,number_of_races,event_multiplier")
          .in("slug", [...upcomingEventSlugs])
          .order("sort_order");

        if (eventError) throw eventError;

        const eventRows = (eventData ?? []) as EventRow[];
        setEvents(eventRows);
        setActiveEventId(eventRows.find((event) => event.is_open_event)?.id ?? eventRows[0]?.id ?? "");

        const eventIds = eventRows.map((event) => event.id);

        const { data: teamData, error: teamError } = await supabase
          .from("fantasy_teams")
          .select("id,user_id,event_id,captain_driver_id,vice_captain_driver_id,submitted_at,locked_at,score_published_at,status,source_event_id,source_event_name,carried_forward_at,fantasy_team_picks(category,driver_id,drivers(driver_name,team_name,car_number))")
          .eq("user_id", authData.user.id);

        if (teamError) throw teamError;
        setTeams((teamData ?? []) as unknown as TeamRow[]);

        const { data: scoreData, error: scoreError } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,fantasy_team_id,published_score,normalised_event_score,raw_team_score,regular_points,captain_points,vice_captain_points,event_multiplier,picks_count,calculated_at,status")
          .eq("user_id", authData.user.id);

        if (scoreError) throw scoreError;
        setScores((scoreData ?? []) as ScoreRow[]);

        const { data: pickScoreData, error: pickScoreError } = await supabase
          .from("fantasy_pick_scores")
          .select("event_id,fantasy_team_id,category,driver_id,driver_name,team_name,car_number,base_driver_score,captain_multiplier,multiplied_driver_score,final_driver_score,is_captain,is_vice_captain")
          .eq("user_id", authData.user.id);

        if (pickScoreError) throw pickScoreError;
        setPickScores((pickScoreData ?? []) as PickScoreRow[]);

        if (eventIds.length) {
          const { data: raceData, error: raceError } = await supabase
            .from("race_results")
            .select("event_id,race_number,driver_id,qualifying_position,finish_position,classification,race_fantasy_points")
            .in("event_id", eventIds);

          if (raceError) throw raceError;
          setRaceResults((raceData ?? []) as RaceResultRow[]);
        }

        const { data: allScoreData } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,published_score");

        setAllScores((allScoreData ?? []) as RankRow[]);
      } catch (error) {
        setErrorMessage(friendlyDataError(error, "Could not load history."));
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
    const scoredEvents = published.length;
    const average = scoredEvents ? totalPoints / scoredEvents : 0;
    const captainPoints = currentScores.reduce((sum, score) => sum + Number(score.captain_points ?? 0), 0);
    const vicePoints = currentScores.reduce((sum, score) => sum + Number(score.vice_captain_points ?? 0), 0);

    const best = published.reduce<ScoreRow | null>((current, score) => {
      if (!current || Number(score.published_score ?? 0) > Number(current.published_score ?? 0)) return score;
      return current;
    }, null);

    const totalsByUser: Record<string, number> = {};
    for (const score of allScores) {
      if (!currentEventIds.has(score.event_id)) continue;
      totalsByUser[score.user_id] = (totalsByUser[score.user_id] ?? 0) + Number(score.published_score ?? 0);
    }

    const sortedTotals = Object.entries(totalsByUser).sort((a, b) => b[1] - a[1]);
    const rank = sortedTotals.findIndex(([id]) => id === userId) + 1;

    return { totalPoints, scoredEvents, average, captainPoints, vicePoints, best, rank };
  }, [currentScores, allScores, currentEventIds, userId]);

  function eventName(eventId: string | null | undefined) {
    return events.find((event) => event.id === eventId)?.name ?? "—";
  }

  function rankForEvent(eventId: string) {
    const ranked = allScores
      .filter((score) => score.event_id === eventId && score.published_score !== null)
      .map((score) => ({ userId: score.user_id, score: Number(score.published_score ?? 0) }))
      .sort((a, b) => b.score - a.score);

    const index = ranked.findIndex((row) => row.userId === userId);
    return index >= 0 ? index + 1 : null;
  }

  function carriedForwardSource(team: TeamRow | undefined) {
    if (!team || team.status !== "carried_forward") return null;
    return team.source_event_name ?? eventName(team.source_event_id) ?? "a previous round";
  }

  function raceRowsFor(eventId: string, driverId: string, event?: EventRow) {
    const rows = raceResults
      .filter((row) => row.event_id === eventId && row.driver_id === driverId)
      .sort((a, b) => Number(a.race_number) - Number(b.race_number));

    const count = Math.max(1, Number(event?.number_of_races ?? rows.length ?? 1));
    return Array.from({ length: count }, (_, index) => rows.find((row) => Number(row.race_number) === index + 1));
  }

  if (loading) return <div className="card">Loading your history...</div>;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="History" title="History and points">
        Compact event history with your team picks, race results and fantasy points.
      </PageHeader>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      {profile ? (
        <section className="card p-3 sm:p-4" style={{ background: profile.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}22, rgba(17,24,39,.86))` : undefined }}>
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <Shield
                number={profile.shield_number ?? 88}
                baseColour={profile.shield_base_colour ?? "#ff7a00"}
                patternColour={profile.shield_pattern_colour ?? "#111827"}
                pattern={profile.shield_pattern ?? "chevron"}
                size={54}
              />
              <div>
                <div className="pill mb-1">{profile.display_name ?? "Manager"}</div>
                <h2 className="text-xl font-black sm:text-2xl">{profile.garage_name ?? "Your Garage"}</h2>
                <p className="text-sm text-track-muted">Overall rank: {statSummary.rank ? `#${statSummary.rank}` : "not ranked yet"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link className="btn btn-primary px-3 py-2 text-xs sm:text-sm" href="/pick-team">Pick team</Link>
              <Link className="btn px-3 py-2 text-xs sm:text-sm" href="/leaderboard">Leaderboard</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Total</div><div className="mt-1 text-2xl font-black">{formatPoints(statSummary.totalPoints)}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Average</div><div className="mt-1 text-2xl font-black">{formatPoints(statSummary.average)}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Scored rounds</div><div className="mt-1 text-2xl font-black">{statSummary.scoredEvents}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs font-black text-track-muted">C / VC boost</div><div className="mt-1 text-xl font-black">{formatPoints(statSummary.captainPoints)} / {formatPoints(statSummary.vicePoints)}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs font-black text-track-muted">Best</div><div className="mt-1 truncate text-xl font-black">{statSummary.best ? `${eventName(statSummary.best.event_id)} · ${formatPoints(statSummary.best.published_score)}` : "—"}</div></div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[.14em] text-track-muted">
              <tr>
                <th className="px-3 py-3">Round</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Rank</th>
                <th className="px-3 py-3">Picks</th>
                <th className="px-3 py-3">Captain</th>
                <th className="px-3 py-3">Vice</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const team = currentTeams.find((item) => item.event_id === event.id);
                const score = currentScores.find((item) => item.event_id === event.id);
                const rowPickScores = pickScores.filter((item) => item.event_id === event.id);
                const teamPicks = team?.fantasy_team_picks ?? [];
                const rowStatus = eventStatus(event, team, score, now);
                const expanded = activeEventId === event.id;
                const captain = rowPickScores.find((item) => item.is_captain) ?? teamPicks.find((item) => item.driver_id === team?.captain_driver_id);
                const vice = rowPickScores.find((item) => item.is_vice_captain) ?? teamPicks.find((item) => item.driver_id === team?.vice_captain_driver_id);
                const rank = rankForEvent(event.id);

                return (
                  <Fragment key={event.id}>
                    <tr className={`border-t border-white/10 ${expanded ? "bg-track-orange/10" : "hover:bg-white/5"}`}>
                      <td className="px-3 py-3 font-black">{event.name}</td>
                      <td className="px-3 py-3"><span className="pill">{rowStatus}</span></td>
                      <td className="px-3 py-3 font-black text-orange-100">{score ? formatPoints(score.published_score) : team ? "Saved" : "—"}</td>
                      <td className="px-3 py-3">{rank ? `#${rank}` : "—"}</td>
                      <td className="px-3 py-3">{score?.picks_count ?? teamPicks.length ?? 0}/6</td>
                      <td className="px-3 py-3">{captain ? `#${"car_number" in captain ? captain.car_number : captain.drivers?.car_number} ${"driver_name" in captain ? captain.driver_name : captain.drivers?.driver_name}` : "—"}</td>
                      <td className="px-3 py-3">{vice ? `#${"car_number" in vice ? vice.car_number : vice.drivers?.car_number} ${"driver_name" in vice ? vice.driver_name : vice.drivers?.driver_name}` : "—"}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black hover:bg-white/10"
                          onClick={() => setActiveEventId(expanded ? "" : event.id)}
                        >
                          {expanded ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>

                    {expanded ? (
                      <tr className="border-t border-track-orange/20 bg-black/20">
                        <td colSpan={8} className="p-3">
                          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                              <div className="text-lg font-black">{event.name}</div>
                              <div className="text-xs text-track-muted">
                                {score?.status === "baseline"
                                  ? `Baseline ${formatPoints(score.published_score)} pts`
                                  : score?.status === "carried_forward" || team?.status === "carried_forward"
                                    ? `Continued from ${carriedForwardSource(team)} · ${formatPoints(score?.published_score)} pts`
                                    : score
                                      ? `Published ${formatPoints(score.published_score)} pts`
                                      : team
                                        ? "Team saved. Awaiting Race Control."
                                        : "No team selected."}
                              </div>
                            </div>
                            {event.is_open_event && !isLocked(event.lockout_at, event.manual_lock, now) ? (
                              <Link className="btn btn-primary px-3 py-2 text-xs" href="/pick-team">Edit team</Link>
                            ) : null}
                          </div>

                          {score ? (
                            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="rounded-xl bg-white/5 p-2"><div className="text-[11px] font-black text-track-muted">Base</div><div className="text-lg font-black">{formatPoints(score.regular_points)}</div></div>
                              <div className="rounded-xl bg-white/5 p-2"><div className="text-[11px] font-black text-track-muted">Captain boost</div><div className="text-lg font-black">{formatPoints(score.captain_points)}</div></div>
                              <div className="rounded-xl bg-white/5 p-2"><div className="text-[11px] font-black text-track-muted">Vice boost</div><div className="text-lg font-black">{formatPoints(score.vice_captain_points)}</div></div>
                              <div className="rounded-xl bg-white/5 p-2"><div className="text-[11px] font-black text-track-muted">Multiplier</div><div className="text-lg font-black">{Number(score.event_multiplier ?? event.event_multiplier ?? 1).toFixed(1)}x</div></div>
                            </div>
                          ) : null}

                          <div className="overflow-x-auto rounded-2xl border border-white/10">
                            <table className="w-full min-w-[980px] text-left text-xs">
                              <thead className="bg-white/5 text-track-muted">
                                <tr>
                                  <th className="p-2">Cat</th>
                                  <th className="p-2">Driver</th>
                                  <th className="p-2">Role</th>
                                  <th className="p-2">Base</th>
                                  <th className="p-2">Final</th>
                                  <th className="p-2">Race 1</th>
                                  <th className="p-2">Race 2</th>
                                  <th className="p-2">Race 3</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categories.map((category) => {
                                  const scoredPick = rowPickScores.find((item) => item.category === category);
                                  const savedPick = teamPicks.find((item) => item.category === category);
                                  const driverId = scoredPick?.driver_id ?? savedPick?.driver_id ?? "";
                                  const rows = driverId ? raceRowsFor(event.id, driverId, event) : [];
                                  const role = scoredPick?.is_captain || savedPick?.driver_id === team?.captain_driver_id
                                    ? "C"
                                    : scoredPick?.is_vice_captain || savedPick?.driver_id === team?.vice_captain_driver_id
                                      ? "VC"
                                      : "—";

                                  return (
                                    <tr key={category} className="border-t border-white/10">
                                      <td className="p-2 font-black">Cat {category}</td>
                                      <td className="p-2">
                                        {scoredPick ? (
                                          <div>
                                            <div className="font-black">#{scoredPick.car_number} {scoredPick.driver_name}</div>
                                            <div className="text-track-muted">{scoredPick.team_name}</div>
                                          </div>
                                        ) : savedPick ? (
                                          <div>
                                            <div className="font-black">#{savedPick.drivers?.car_number} {savedPick.drivers?.driver_name}</div>
                                            <div className="text-track-muted">{savedPick.drivers?.team_name}</div>
                                          </div>
                                        ) : (
                                          <span className="text-track-muted">N/A</span>
                                        )}
                                      </td>
                                      <td className="p-2 font-black">{role}</td>
                                      <td className="p-2">{scoredPick ? formatPoints(scoredPick.base_driver_score) : "—"}</td>
                                      <td className="p-2 font-black text-orange-100">{scoredPick ? formatPoints(scoredPick.final_driver_score) : "—"}</td>
                                      {Array.from({ length: 3 }, (_, index) => index + 1).map((raceNumber) => {
                                        const result = rows[raceNumber - 1];
                                        const qPoints = qualifyingPoints(result?.qualifying_position);
                                        const rPoints = racePointsOnly(result);
                                        return (
                                          <td key={raceNumber} className="p-2">
                                            {result ? (
                                              <div className="leading-5">
                                                <div className="font-black text-orange-100">{formatPoints(result.race_fantasy_points)} raw</div>
                                                <div className="text-track-muted">Q {positionLabel(result.qualifying_position)} · {qPoints}</div>
                                                <div className="text-track-muted">R {positionLabel(result.finish_position, result.classification)} · {rPoints}</div>
                                              </div>
                                            ) : (
                                              <span className="text-track-muted">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
