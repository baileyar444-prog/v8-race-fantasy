"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
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
};

type EventRow = {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
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
};

type FantasyTeam = {
  id: string;
  user_id: string;
  event_id: string;
  submitted_at: string | null;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  fantasy_team_picks?: {
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: authData } = await supabase.auth.getUser();
        setUserId(authData.user?.id ?? "");

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id,slug,name,full_name,is_open_event,sort_order")
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
          .select("id,display_name,garage_name,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number")
          .order("created_at", { ascending: true });

        if (profileError) throw profileError;

        const filteredProfiles = allowedUserIds
          ? (profileData ?? []).filter((profile) => allowedUserIds?.includes(profile.id))
          : (profileData ?? []);

        setProfiles(filteredProfiles as Profile[]);

        const { data: scoreData, error: scoreError } = await supabase
          .from("fantasy_scores")
          .select("user_id,event_id,published_score,normalised_event_score,captain_points,vice_captain_points,picks_count");

        if (scoreError) throw scoreError;
        setScores((scoreData ?? []) as Score[]);

        const { data: teamData, error: teamError } = await supabase
          .from("fantasy_teams")
          .select("id,user_id,event_id,submitted_at,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(driver_id,drivers(driver_name,team_name,car_number))");

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

  const totalPublishedScores = currentScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);


  function leaderboardHref(eventSlug: string | "overall") {
    const params = new URLSearchParams();
    if (leagueCode) params.set("league", leagueCode);
    if (eventSlug !== "overall") params.set("event", eventSlug);
    const query = params.toString();
    return `/leaderboard${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={league ? `League: ${league.share_code}` : "Overall and event ladders"}
        title={league ? league.name : "Leaderboard"}
      >
        View the overall ladder or switch to a specific event leaderboard. Event pages show who won that round.
      </PageHeader>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
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

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-black">Choose leaderboard</h2>
            <p className="text-sm text-track-muted">Overall combines every published event. Event tabs show each round by itself.</p>
          </div>
          <Link className="btn" href="/leagues">Manage leagues</Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className={`rounded-2xl border px-4 py-3 font-black ${selectedEventId === "overall" ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`} href={leaderboardHref("overall")}>Overall</Link>
          {events.map((event) => (
            <Link
              key={event.id}
              className={`rounded-2xl border px-4 py-3 font-black ${selectedEvent?.id === event.id ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`}
              href={leaderboardHref(event.slug)}
            >
              {event.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="card overflow-x-auto">
        <div className="mb-4">
          <h2 className="text-2xl font-black">{selectedEvent ? `${selectedEvent.name} leaderboard` : league ? "League ladder" : "Overall ladder"}</h2>
          <p className="text-sm text-track-muted">
            {selectedEvent ? "Sorted by this event score first." : "Sorted by total published fantasy points."}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-track-muted">Loading leaderboard...</div>
        ) : rows.length ? (
          <table className="w-full min-w-[920px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-track-muted">
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Garage</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">{selectedEvent ? "Event pts" : "Overall pts"}</th>
                <th className="px-3 py-2 text-right">Overall pts</th>
                <th className="px-3 py-2 text-right">Scored events</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.profile.id} className="rounded-2xl bg-white/5" style={{ background: row.profile.banner_colour ? `linear-gradient(90deg, ${row.profile.banner_colour}1f, rgba(255,255,255,.05))` : undefined }}>
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
                        <div className="font-black">{row.profile.garage_name ?? "Unnamed Garage"}</div>
                        <div className="text-xs text-track-muted">Captain boost: {points(row.captainPoints)} · VC boost: {points(row.vicePoints)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-track-muted">{row.profile.display_name ?? "Manager"}</td>
                  <td className="px-3 py-3 text-track-muted">{row.hasTeam ? selectedEvent ? "Team saved" : "Active" : selectedEvent ? "No team" : "No teams yet"}</td>
                  <td className="px-3 py-3 text-right text-xl font-black">{points(row.eventScore)}</td>
                  <td className="px-3 py-3 text-right font-black">{points(row.totalScore)}</td>
                  <td className="rounded-r-2xl px-3 py-3 text-right font-black">{row.scoredEvents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-track-muted">
            No users found yet. Create an account, save a garage/team, then refresh this page.
          </div>
        )}
      </div>
    </div>
  );
}
