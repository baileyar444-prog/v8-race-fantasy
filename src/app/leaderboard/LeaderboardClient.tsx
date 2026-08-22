"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { isLocked } from "@/components/LockoutCountdown";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { upcomingEventSlugs } from "@/lib/mock-data";

type Profile = {
  id: string;
  display_name: string | null;
  garage_name: string | null;
  banner_colour: string | null;
  shield_base_colour: string | null;
  shield_pattern_colour: string | null;
  shield_pattern: string | null;
  shield_number: number | null;
  last_seen_at?: string | null;
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
};

type Score = {
  user_id: string;
  event_id: string;
  published_score: number | null;
  normalised_event_score: number | null;
  captain_points?: number | null;
  vice_captain_points?: number | null;
  picks_count?: number | null;
  status?: string | null;
};

type FantasyTeam = {
  id: string;
  user_id: string;
  event_id: string;
  submitted_at: string | null;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  status?: string | null;
  source_event_id?: string | null;
  source_event_name?: string | null;
  carried_forward_at?: string | null;
  fantasy_team_picks?: {
    category: string;
    driver_id: string;
    drivers?: {
      driver_name: string | null;
      team_name: string | null;
      car_number: string | null;
    } | null;
  }[];
};

type League = {
  id: string;
  name: string;
  share_code: string;
};

type Row = {
  profile: Profile;
  totalScore: number;
  eventScore: number;
  hasTeam: boolean;
  scoredEvents: number;
  captainPoints: number;
  vicePoints: number;
  position: number;
};

function points(value: number | null | undefined) {
  return Math.round(Number(value ?? 0) * 10) / 10;
}

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

export function LeaderboardClient() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const leagueCode = searchParams.get("league");
  const eventParam = searchParams.get("event") ?? "overall";

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTeamUserId, setSelectedTeamUserId] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: authData } = await supabase.auth.getUser();
        setUserId(authData.user?.id ?? "");

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id,slug,name,full_name,lockout_at,manual_lock,is_open_event,sort_order")
          .in("slug", [...upcomingEventSlugs])
          .order("sort_order");

        if (eventError) throw eventError;
        setEvents((eventData ?? []) as EventRow[]);

        let allowedUserIds: string[] | null = null;

        if (leagueCode) {
          const { data: leagueData, error: leagueError } = await supabase
            .from("leagues")
            .select("id,name,share_code")
            .eq("share_code", leagueCode)
            .maybeSingle();

          if (leagueError) throw leagueError;
          if (!leagueData) throw new Error("League not found.");

          setLeague(leagueData);

          const { data: members, error: membersError } = await supabase
            .from("league_members")
            .select("user_id")
            .eq("league_id", leagueData.id);

          if (membersError) throw membersError;

          allowedUserIds = (members ?? []).map((member) => member.user_id);
        } else {
          setLeague(null);
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,display_name,garage_name,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number,last_seen_at")
          .order("created_at", { ascending: true });

        if (profileError) throw profileError;

        const filteredProfiles = allowedUserIds
          ? (profileData ?? []).filter((profile) => allowedUserIds?.includes(profile.id))
          : (profileData ?? []);

        setProfiles(filteredProfiles as Profile[]);

        const { data: scoreData, error: scoreError } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,published_score,normalised_event_score,captain_points,vice_captain_points,picks_count,status");

        if (scoreError) throw scoreError;
        setScores((scoreData ?? []) as Score[]);

        const { data: teamData, error: teamError } = await supabase
          .from("fantasy_teams")
          .select("id,user_id,event_id,submitted_at,captain_driver_id,vice_captain_driver_id,status,source_event_id,source_event_name,carried_forward_at,fantasy_team_picks(category,driver_id,drivers(driver_name,team_name,car_number))");

        if (teamError) throw teamError;
        setTeams((teamData ?? []) as FantasyTeam[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load leaderboard.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase, leagueCode]);

  const selectedEvent = events.find((event) => event.slug === eventParam || event.id === eventParam) ?? null;
  const selectedEventId = selectedEvent?.id ?? "overall";
  const selectedLabel = selectedEvent ? selectedEvent.name : "Overall";

  const currentEventIds = useMemo(() => new Set(events.map((event) => event.id)), [events]);
  const currentScores = useMemo(() => scores.filter((score) => currentEventIds.has(score.event_id)), [scores, currentEventIds]);

  const rows = useMemo<Row[]>(() => {
    const mapped = profiles.map((profile) => {
      const userScores = currentScores.filter((score) => score.user_id === profile.id);
      const totalScore = userScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);
      const eventScore = selectedEvent
        ? userScores.filter((score) => score.event_id === selectedEvent.id).reduce((sum, score) => sum + Number(score.published_score ?? 0), 0)
        : totalScore;

      const hasTeam = selectedEvent
        ? teams.some((team) => team.user_id === profile.id && team.event_id === selectedEvent.id)
        : teams.some((team) => team.user_id === profile.id);

      const captainPoints = userScores.reduce((sum, score) => sum + Number(score.captain_points ?? 0), 0);
      const vicePoints = userScores.reduce((sum, score) => sum + Number(score.vice_captain_points ?? 0), 0);

      return {
        profile,
        totalScore,
        eventScore,
        hasTeam,
        scoredEvents: userScores.filter((score) => Number(score.published_score ?? 0) > 0).length,
        captainPoints,
        vicePoints,
        position: 0
      };
    });

    mapped.sort((a, b) => {
      if (b.eventScore !== a.eventScore) return b.eventScore - a.eventScore;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (Number(b.hasTeam) !== Number(a.hasTeam)) return Number(b.hasTeam) - Number(a.hasTeam);
      return (a.profile.garage_name ?? "").localeCompare(b.profile.garage_name ?? "");
    });

    return mapped.map((row, index) => ({ ...row, position: index + 1 }));
  }, [profiles, currentScores, teams, selectedEvent]);

  const overallRows = useMemo<Row[]>(() => {
    const mapped = profiles.map((profile) => {
      const userScores = currentScores.filter((score) => score.user_id === profile.id);
      const totalScore = userScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);
      const hasTeam = teams.some((team) => team.user_id === profile.id);
      const captainPoints = userScores.reduce((sum, score) => sum + Number(score.captain_points ?? 0), 0);
      const vicePoints = userScores.reduce((sum, score) => sum + Number(score.vice_captain_points ?? 0), 0);

      return {
        profile,
        totalScore,
        eventScore: totalScore,
        hasTeam,
        scoredEvents: userScores.filter((score) => Number(score.published_score ?? 0) > 0).length,
        captainPoints,
        vicePoints,
        position: 0
      };
    });

    mapped.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (Number(b.hasTeam) !== Number(a.hasTeam)) return Number(b.hasTeam) - Number(a.hasTeam);
      return (a.profile.garage_name ?? "").localeCompare(b.profile.garage_name ?? "");
    });

    return mapped.map((row, index) => ({ ...row, position: index + 1 }));
  }, [profiles, currentScores, teams]);

  const myOverallRow = useMemo(() => {
    return overallRows.find((row) => row.profile.id === userId) ?? null;
  }, [overallRows, userId]);

  const myViewRow = useMemo(() => {
    return rows.find((row) => row.profile.id === userId) ?? null;
  }, [rows, userId]);

  function isBaselineScore(row: Row) {
    if (!selectedEvent) return false;
    return currentScores.some((score) =>
      score.user_id === row.profile.id &&
      score.event_id === selectedEvent.id &&
      (score.status === "baseline" || (!row.hasTeam && Number(score.published_score ?? 0) > 0))
    );
  }

  const totalPublishedScores = currentScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);

  function canRevealEventTeam(event: EventRow | null | undefined, teamUserId: string) {
    if (!event) return false;
    if (teamUserId === userId) return true;
    if (isLocked(event.lockout_at, event.manual_lock)) return true;
    return scores.some((score) => score.event_id === event.id && score.published_score !== null);
  }

  function teamDetailsForRow(row: Row | null | undefined) {
    if (!row) return null;

    if (selectedEvent) {
      const team = teams.find((item) => item.user_id === row.profile.id && item.event_id === selectedEvent.id) ?? null;
      return {
        row,
        team,
        event: selectedEvent,
        canReveal: Boolean(team && canRevealEventTeam(selectedEvent, row.profile.id))
      };
    }

    const userTeams = teams
      .filter((team) => team.user_id === row.profile.id)
      .map((team) => ({
        team,
        event: events.find((event) => event.id === team.event_id) ?? null
      }))
      .filter((item) => item.event)
      .sort((a, b) => (b.event?.sort_order ?? 0) - (a.event?.sort_order ?? 0));

    const visible = userTeams.find((item) => canRevealEventTeam(item.event, row.profile.id)) ?? userTeams[0];

    return {
      row,
      team: visible?.team ?? null,
      event: visible?.event ?? null,
      canReveal: Boolean(visible?.team && visible?.event && canRevealEventTeam(visible.event, row.profile.id))
    };
  }

  function teamButtonLabel(row: Row) {
    const details = teamDetailsForRow(row);
    if (!details?.team) return "No team";
    if (!details.canReveal) return "After lockout";
    if (details.team.status === "carried_forward") return selectedTeamUserId === row.profile.id ? "Hide continued" : "View continued";
    return selectedTeamUserId === row.profile.id ? "Hide team" : "View team";
  }

  function carriedForwardSource(team: FantasyTeam | null | undefined) {
    if (!team || team.status !== "carried_forward") return null;
    return team.source_event_name ?? events.find((event) => event.id === team.source_event_id)?.name ?? "a previous round";
  }

  function pickLabel(team: FantasyTeam, category: string) {
    const pick = team.fantasy_team_picks?.find((item) => item.category === category);
    if (!pick) return "N/A";

    const captain = pick.driver_id === team.captain_driver_id;
    const vice = pick.driver_id === team.vice_captain_driver_id;
    const tag = captain ? " C" : vice ? " VC" : "";

    return `#${pick.drivers?.car_number ?? "?"} ${pick.drivers?.driver_name ?? "Unknown"}${tag}`;
  }

  function pickClass(team: FantasyTeam, category: string) {
    const pick = team.fantasy_team_picks?.find((item) => item.category === category);
    if (!pick) return "border-white/10 bg-black/20 text-track-muted";
    if (pick.driver_id === team.captain_driver_id) return "border-track-orange/40 bg-track-orange/15 text-orange-100";
    if (pick.driver_id === team.vice_captain_driver_id) return "border-sky-300/30 bg-sky-500/10 text-sky-100";
    return "border-white/10 bg-white/5";
  }

  function leaderboardHref(eventSlug: string | "overall") {
    const params = new URLSearchParams();
    if (leagueCode) params.set("league", leagueCode);
    if (eventSlug !== "overall") params.set("event", eventSlug);
    const query = params.toString();
    return `/leaderboard${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        eyebrow={league ? `League: ${league.share_code}` : "Overall and event ladders"}
        title={league ? league.name : "Leaderboard"}
      >
        View the overall ladder or switch to a specific event leaderboard. Event pages show who won that round.
      </PageHeader>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:hidden">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-track-muted">Members</div>
            <div className="text-lg font-black">{loading ? "—" : rows.length}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-track-muted">Viewing</div>
            <div className="truncate text-lg font-black">{selectedLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-track-muted">Points</div>
            <div className="text-lg font-black">{points(totalPublishedScores)}</div>
          </div>
        </div>
      </div>

      <div className="hidden gap-4 sm:grid lg:grid-cols-3">
        <div className="card">
          <div className="text-sm font-black text-track-muted">Members shown</div>
          <div className="mt-2 text-4xl font-black">{loading ? "—" : rows.length}</div>
        </div>
        <div className="card">
          <div className="text-sm font-black text-track-muted">Viewing</div>
          <div className="mt-2 text-2xl font-black">{selectedLabel}</div>
        </div>
        <div className="card">
          <div className="text-sm font-black text-track-muted">Published points</div>
          <div className="mt-2 text-2xl font-black">{points(totalPublishedScores)}</div>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:card">
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-4 sm:flex-col sm:items-start lg:flex-row lg:items-end">
          <div>
            <h2 className="text-base font-black sm:text-2xl">Choose leaderboard</h2>
            <p className="hidden text-sm text-track-muted sm:block">Overall combines every published event. Event tabs show each round by itself.</p>
          </div>
          <Link className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black hover:bg-white/10 sm:btn" href="/leagues">Manage leagues</Link>
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
          <Link className={`shrink-0 rounded-full border px-3 py-2 text-sm font-black sm:rounded-2xl sm:px-4 sm:py-3 ${selectedEventId === "overall" ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`} href={leaderboardHref("overall")}>Overall</Link>
          {events.map((event) => (
            <Link
              key={event.id}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-black sm:rounded-2xl sm:px-4 sm:py-3 ${selectedEvent?.id === event.id ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`}
              href={leaderboardHref(event.slug)}
            >
              {event.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="card overflow-x-auto">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-xl font-black sm:text-2xl">{selectedEvent ? `${selectedEvent.name} leaderboard` : league ? "League ladder" : "Overall ladder"}</h2>
          <p className="hidden text-sm text-track-muted sm:block">
            {selectedEvent ? "Sorted by this event score first." : "Sorted by total published fantasy points."}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-track-muted">Loading leaderboard...</div>
        ) : rows.length ? (
          <>
            <div className="space-y-3 sm:hidden">
              {rows.map((row) => {
                const details = teamDetailsForRow(row);
                const canToggleTeam = Boolean(details?.team && details.canReveal);

                return (
                  <div key={`mobile-${row.profile.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-3" style={{ background: row.profile.banner_colour ? `linear-gradient(135deg, ${row.profile.banner_colour}1f, rgba(255,255,255,.05))` : undefined }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Shield
                          number={row.profile.shield_number ?? 88}
                          baseColour={row.profile.shield_base_colour ?? "#ff7a1a"}
                          patternColour={row.profile.shield_pattern_colour ?? "#111827"}
                          pattern={row.profile.shield_pattern ?? "chevron"}
                          size={38}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-black">#{row.position} {row.profile.garage_name ?? "Unnamed Garage"}</div>
                          <div className="mt-1 text-xs text-track-muted">
                            {isOnline(row.profile.last_seen_at) ? "Online" : isBaselineScore(row) ? "Baseline 150" : row.hasTeam ? "Team saved" : "No team"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black">{points(row.eventScore)}</div>
                        <div className="text-[10px] font-black uppercase tracking-[.14em] text-track-muted">{selectedEvent ? "Event" : "Overall"}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-black/20 p-2">
                        <div className="font-black">{points(row.totalScore)}</div>
                        <div className="text-[10px] text-track-muted">Total</div>
                      </div>
                      <div className="rounded-xl bg-black/20 p-2">
                        <div className="font-black">{row.scoredEvents}</div>
                        <div className="text-[10px] text-track-muted">Events</div>
                      </div>
                      <button
                        className={`rounded-xl p-2 text-xs font-black ${canToggleTeam ? "bg-track-orange text-black" : "bg-white/5 text-track-muted"}`}
                        disabled={!canToggleTeam}
                        onClick={() => setSelectedTeamUserId(selectedTeamUserId === row.profile.id ? "" : row.profile.id)}
                      >
                        {teamButtonLabel(row)}
                      </button>
                    </div>

                    {selectedTeamUserId === row.profile.id && details?.team && details.canReveal ? (
                      <div className="mt-3 rounded-2xl border border-track-orange/25 bg-black/25 p-3">
                        <div className="mb-2 text-sm font-black">{details.event?.name ?? "Round"} team</div>
                        {carriedForwardSource(details.team) ? (
                          <div className="mb-2 rounded-xl border border-track-orange/25 bg-track-orange/10 p-2 text-xs font-bold text-orange-100">
                            Continued from {carriedForwardSource(details.team)}. Blank categories show as N/A.
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          {["A", "B", "C", "D", "E", "F"].map((category) => (
                            <div key={`mobile-${row.profile.id}-${category}`} className={`rounded-xl border p-2 ${pickClass(details.team!, category)}`}>
                              <div className="text-[10px] font-black uppercase tracking-[.14em] text-track-muted">Class {category}</div>
                              <div className="mt-1 text-xs font-black">{pickLabel(details.team!, category)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <table className="hidden w-full min-w-[1050px] border-separate border-spacing-y-2 sm:table">
            <thead>
              <tr className="text-left text-sm text-track-muted">
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Garage</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">{selectedEvent ? "Event pts" : "Overall pts"}</th>
                <th className="px-3 py-2 text-right">Overall pts</th>
                <th className="px-3 py-2 text-right">Scored events</th>
                <th className="px-3 py-2 text-right">Team</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const details = teamDetailsForRow(row);
                const canToggleTeam = Boolean(details?.team && details.canReveal);

                return (
                  <Fragment key={row.profile.id}>
                    <tr className="rounded-2xl bg-white/5" style={{ background: row.profile.banner_colour ? `linear-gradient(90deg, ${row.profile.banner_colour}1f, rgba(255,255,255,.05))` : undefined }}>
                  <td className="rounded-l-2xl px-3 py-3 text-xl font-black">#{row.position}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Shield
                        number={row.profile.shield_number ?? 88}
                        baseColour={row.profile.shield_base_colour ?? "#ff7a1a"}
                        patternColour={row.profile.shield_pattern_colour ?? "#111827"}
                        pattern={row.profile.shield_pattern ?? "chevron"}
                        size={42}
                      />
                      <div>
                        <div className="flex items-center gap-2 font-black">
                          <span>{row.profile.garage_name ?? "Unnamed Garage"}</span>
                          {isOnline(row.profile.last_seen_at) ? <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,.9)]" title="Online now" /> : null}
                        </div>
                        <div className="text-xs text-track-muted">Captain boost: {points(row.captainPoints)} · VC boost: {points(row.vicePoints)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-track-muted">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${isOnline(row.profile.last_seen_at) ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,.9)]" : "bg-white/20"}`} />
                      <span>{isOnline(row.profile.last_seen_at) ? "Online" : isBaselineScore(row) ? "Baseline 150" : row.hasTeam ? selectedEvent ? "Team saved" : "Active" : selectedEvent ? "No team" : "No teams yet"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-xl font-black">{points(row.eventScore)}</td>
                  <td className="px-3 py-3 text-right font-black">{points(row.totalScore)}</td>
                  <td className="px-3 py-3 text-right font-black">{row.scoredEvents}</td>
                  <td className="rounded-r-2xl px-3 py-3 text-right">
                    <button
                      className={`rounded-full px-3 py-2 text-xs font-black ${canToggleTeam ? "bg-track-orange text-black hover:bg-orange-300" : "bg-white/5 text-track-muted"}`}
                      disabled={!canToggleTeam}
                      onClick={() => setSelectedTeamUserId(selectedTeamUserId === row.profile.id ? "" : row.profile.id)}
                    >
                      {teamButtonLabel(row)}
                    </button>
                  </td>
                </tr>

                {selectedTeamUserId === row.profile.id && details?.team && details.canReveal ? (
                  <tr>
                    <td colSpan={7} className="rounded-2xl border border-track-orange/25 bg-black/30 p-4">
                      <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <div className="pill mb-2">{details.event?.name ?? "Round"} team</div>
                          <h3 className="text-xl font-black">{row.profile.garage_name ?? "Unnamed Garage"}</h3>
                          <p className="text-sm text-track-muted">C = captain, VC = vice-captain. Current round teams stay hidden until lockout unless it is your own team.</p>
                          {carriedForwardSource(details.team) ? (
                            <p className="mt-2 rounded-xl border border-track-orange/25 bg-track-orange/10 p-2 text-sm font-bold text-orange-100">
                              Continued from {carriedForwardSource(details.team)}. Blank categories show as N/A.
                            </p>
                          ) : null}
                        </div>
                        <Link className="btn px-4 py-2 text-sm" href={details.event ? leaderboardHref(details.event.slug) : "/leaderboard"}>
                          View round ladder
                        </Link>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {["A", "B", "C", "D", "E", "F"].map((category) => (
                          <div key={`${row.profile.id}-${category}`} className={`rounded-2xl border p-3 ${pickClass(details.team!, category)}`}>
                            <div className="text-[10px] font-black uppercase tracking-[.18em] text-track-muted">Class {category}</div>
                            <div className="mt-1 text-sm font-black">{pickLabel(details.team!, category)}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-track-muted">
            No users found yet. Create an account, save a garage/team, then refresh this page.
          </div>
        )}
      </div>
    </div>
  );
}
