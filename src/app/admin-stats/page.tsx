"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";
import { upcomingEventSlugs } from "@/lib/mock-data";

type Profile = {
  id: string;
  created_at: string | null;
  display_name: string | null;
  garage_name: string | null;
  role: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_open_event: boolean;
  lockout_at?: string | null;
  manual_lock?: boolean | null;
};

type Driver = {
  id: string;
  driver_name: string;
  car_number: string;
  team_name: string;
  category: string;
};

type League = {
  id: string;
  name: string;
  share_code: string;
  created_at: string | null;
};

type LeagueMember = {
  league_id: string;
  user_id: string;
};

type FantasyTeam = {
  id: string;
  user_id: string;
  event_id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  submitted_at: string | null;
};

type FantasyPick = {
  fantasy_team_id: string;
  category: string;
  driver_id: string;
  drivers?: {
    driver_name: string;
    car_number: string;
    team_name: string;
  } | null;
};

type Score = {
  user_id: string;
  event_id: string;
  published_score: number | null;
  picks_count: number | null;
};

type PopularDriver = {
  driverId: string;
  label: string;
  teamName: string;
  count: number;
  percentage: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function percent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function dayLabel(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function AdminStatsPage() {
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMember[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [picks, setPicks] = useState<FantasyPick[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [authorised, setAuthorised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          window.location.href = "/login";
          return;
        }

        const { data: profile, error: roleError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (roleError) throw roleError;

        if (profile?.role !== "admin") {
          setAuthorised(false);
          setLoading(false);
          return;
        }

        setAuthorised(true);

        const [
          profileResult,
          eventResult,
          driverResult,
          leagueResult,
          leagueMemberResult,
          teamResult,
          pickResult,
          scoreResult
        ] = await Promise.all([
          supabase.from("profiles").select("id,created_at,display_name,garage_name,role").order("created_at", { ascending: true }),
          supabase.from("events").select("id,slug,name,sort_order,is_open_event,lockout_at,manual_lock").in("slug", [...upcomingEventSlugs]).order("sort_order"),
          supabase.from("drivers").select("id,driver_name,car_number,team_name,category").eq("is_active", true),
          supabase.from("leagues").select("id,name,share_code,created_at").order("created_at", { ascending: false }),
          supabase.from("league_members").select("league_id,user_id"),
          supabase.from("fantasy_teams").select("id,user_id,event_id,captain_driver_id,vice_captain_driver_id,submitted_at"),
          supabase.from("fantasy_team_picks").select("fantasy_team_id,category,driver_id,drivers(driver_name,car_number,team_name)"),
          supabase.from("fantasy_scores").select("user_id,event_id,published_score,picks_count")
        ]);

        if (profileResult.error) throw profileResult.error;
        if (eventResult.error) throw eventResult.error;
        if (driverResult.error) throw driverResult.error;
        if (leagueResult.error) throw leagueResult.error;
        if (leagueMemberResult.error) throw leagueMemberResult.error;
        if (teamResult.error) throw teamResult.error;
        if (pickResult.error) throw pickResult.error;
        if (scoreResult.error) throw scoreResult.error;

        setProfiles((profileResult.data ?? []) as Profile[]);
        setEvents((eventResult.data ?? []) as EventRow[]);
        setDrivers((driverResult.data ?? []) as Driver[]);
        setLeagues((leagueResult.data ?? []) as League[]);
        setLeagueMembers((leagueMemberResult.data ?? []) as LeagueMember[]);
        setTeams((teamResult.data ?? []) as FantasyTeam[]);
        setPicks((pickResult.data ?? []) as unknown as FantasyPick[]);
        setScores((scoreResult.data ?? []) as Score[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load website statistics.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  const stats = useMemo(() => {
    const currentEventIds = new Set(events.map((event) => event.id));
    const currentTeams = teams.filter((team) => currentEventIds.has(team.event_id));
    const currentScores = scores.filter((score) => currentEventIds.has(score.event_id));
    const teamIds = new Set(currentTeams.map((team) => team.id));
    const currentPicks = picks.filter((pick) => teamIds.has(pick.fantasy_team_id));

    const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
    const teamById = new Map(currentTeams.map((team) => [team.id, team]));

    function popularityForEvent(eventId: string) {
      const eventTeams = currentTeams.filter((team) => team.event_id === eventId);
      const eventTeamIds = new Set(eventTeams.map((team) => team.id));
      const eventPicks = currentPicks.filter((pick) => eventTeamIds.has(pick.fantasy_team_id));
      const counts = new Map<string, number>();

      for (const pick of eventPicks) {
        counts.set(pick.driver_id, (counts.get(pick.driver_id) ?? 0) + 1);
      }

      const totalTeams = eventTeams.length || 1;

      return [...counts.entries()]
        .map(([driverId, count]) => {
          const joinedDriver = eventPicks.find((pick) => pick.driver_id === driverId)?.drivers;
          const driver = driverById.get(driverId);
          return {
            driverId,
            label: `#${joinedDriver?.car_number ?? driver?.car_number ?? "?"} ${joinedDriver?.driver_name ?? driver?.driver_name ?? "Unknown driver"}`,
            teamName: joinedDriver?.team_name ?? driver?.team_name ?? "",
            count,
            percentage: (count / totalTeams) * 100
          };
        })
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, 5) as PopularDriver[];
    }

    function countCaptaincy(field: "captain_driver_id" | "vice_captain_driver_id") {
      const counts = new Map<string, number>();

      for (const team of currentTeams) {
        const driverId = team[field];
        if (!driverId) continue;
        counts.set(driverId, (counts.get(driverId) ?? 0) + 1);
      }

      const totalTeams = currentTeams.length || 1;

      return [...counts.entries()]
        .map(([driverId, count]) => {
          const driver = driverById.get(driverId);
          return {
            driverId,
            label: `#${driver?.car_number ?? "?"} ${driver?.driver_name ?? "Unknown driver"}`,
            teamName: driver?.team_name ?? "",
            count,
            percentage: (count / totalTeams) * 100
          };
        })
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, 5) as PopularDriver[];
    }

    const leagueMemberCounts = leagues.map((league) => ({
      league,
      count: leagueMembers.filter((member) => member.league_id === league.id).length
    }));

    leagueMemberCounts.sort((a, b) => b.count - a.count || a.league.name.localeCompare(b.league.name));

    const signupsByDay = new Map<string, number>();
    for (const profile of profiles) {
      const label = dayLabel(profile.created_at);
      signupsByDay.set(label, (signupsByDay.get(label) ?? 0) + 1);
    }

    const totalPublishedPoints = currentScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);
    const scoredUsers = new Set(currentScores.filter((score) => Number(score.published_score ?? 0) > 0).map((score) => score.user_id));

    return {
      currentTeams,
      currentPicks,
      currentScores,
      accountCount: profiles.length,
      adminCount: profiles.filter((profile) => profile.role === "admin").length,
      garageCount: profiles.filter((profile) => Boolean(profile.garage_name)).length,
      leagueCount: leagues.length,
      leagueMemberCount: leagueMembers.length,
      averageLeagueSize: leagues.length ? leagueMembers.length / leagues.length : 0,
      teamSubmissionCount: currentTeams.length,
      uniqueManagersWithTeams: new Set(currentTeams.map((team) => team.user_id)).size,
      scoredManagers: scoredUsers.size,
      totalPublishedPoints,
      averagePublishedScore: currentScores.length ? totalPublishedPoints / currentScores.length : 0,
      mostPopularCaptains: countCaptaincy("captain_driver_id"),
      mostPopularViceCaptains: countCaptaincy("vice_captain_driver_id"),
      popularByEvent: events.map((event) => ({
        event,
        teamCount: currentTeams.filter((team) => team.event_id === event.id).length,
        pickCount: currentPicks.filter((pick) => teamById.get(pick.fantasy_team_id)?.event_id === event.id).length,
        popular: popularityForEvent(event.id)
      })),
      topLeagues: leagueMemberCounts.slice(0, 5),
      signupsByDay: [...signupsByDay.entries()].slice(-7).reverse()
    };
  }, [profiles, events, drivers, leagues, leagueMembers, teams, picks, scores]);

  const openEvent = events.find((event) => event.is_open_event) ?? null;
  const openEventTeams = openEvent ? teams.filter((team) => team.event_id === openEvent.id) : [];
  const openEventScores = openEvent ? scores.filter((score) => score.event_id === openEvent.id) : [];
  const incompleteOpenTeams = openEventTeams.filter((team) => {
    const teamPicks = picks.filter((pick) => pick.fantasy_team_id === team.id);
    return teamPicks.length < 6 || !team.captain_driver_id || !team.vice_captain_driver_id || team.captain_driver_id === team.vice_captain_driver_id;
  }).length;

  const healthChecks = [
    { label: "Open event selected", ok: Boolean(openEvent), detail: openEvent?.name ?? "No event marked open" },
    { label: "Lockout time set", ok: Boolean(openEvent?.lockout_at), detail: openEvent?.lockout_at ? new Date(openEvent.lockout_at).toLocaleString() : "Missing lockout" },
    { label: "Drivers loaded", ok: drivers.length >= 24, detail: `${drivers.length} active drivers visible` },
    { label: "Saved teams for open event", ok: openEventTeams.length > 0, detail: `${openEventTeams.length} saved teams` },
    { label: "Incomplete teams check", ok: incompleteOpenTeams === 0, detail: `${incompleteOpenTeams} incomplete/invalid teams` },
    { label: "Scores published", ok: openEventScores.length > 0, detail: `${openEventScores.length} scored managers` }
  ];

  if (loading) {
    return <div className="card">Loading website statistics...</div>;
  }

  if (!authorised) {
    return (
      <div className="card">
        <h1 className="text-3xl font-black">Admin only</h1>
        <p className="mt-2 text-track-muted">Website statistics are only available to the admin account.</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="card">
        <h1 className="text-3xl font-black">Could not load statistics</h1>
        <p className="mt-2 text-track-muted">{errorMessage}</p>
        <p className="mt-3 text-sm text-track-muted">
          Run the admin stats SQL file in Supabase, then refresh this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Website statistics">
        Track account signups, league creation, team submissions and the most popular driver picks by race weekend.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Accounts</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.accountCount)}</div>
          <p className="mt-2 text-sm text-track-muted">{formatNumber(stats.garageCount)} have a Garage / Team Name.</p>
        </div>
        <div className="card">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Leagues</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.leagueCount)}</div>
          <p className="mt-2 text-sm text-track-muted">Average size: {Math.round(stats.averageLeagueSize * 10) / 10} members.</p>
        </div>
        <div className="card">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Saved teams</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.teamSubmissionCount)}</div>
          <p className="mt-2 text-sm text-track-muted">{formatNumber(stats.uniqueManagersWithTeams)} unique managers have picked a team.</p>
        </div>
        <div className="card">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Scored managers</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.scoredManagers)}</div>
          <p className="mt-2 text-sm text-track-muted">Avg score: {Math.round(stats.averagePublishedScore)} pts.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card">
          <h2 className="text-2xl font-black">Most popular picks per race weekend</h2>
          <div className="mt-4 space-y-4">
            {stats.popularByEvent.map(({ event, teamCount, popular }) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-black">{event.name}</h3>
                    <p className="text-sm text-track-muted">{formatNumber(teamCount)} saved teams</p>
                  </div>
                  {event.is_open_event ? <div className="pill">Open event</div> : null}
                </div>

                {popular.length ? (
                  <div className="mt-3 space-y-2">
                    {popular.map((driver, index) => (
                      <div key={driver.driverId} className="grid gap-2 rounded-xl bg-black/20 p-3 sm:grid-cols-[36px_1fr_120px] sm:items-center">
                        <div className="font-black text-track-orange">#{index + 1}</div>
                        <div>
                          <div className="font-black">{driver.label}</div>
                          <div className="text-sm text-track-muted">{driver.teamName}</div>
                        </div>
                        <div className="text-sm font-black">{formatNumber(driver.count)} picks · {percent(driver.percentage)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-track-muted">No teams picked for this event yet.</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="card">
            <h2 className="text-2xl font-black">Most popular captains</h2>
            <div className="mt-3 space-y-2">
              {stats.mostPopularCaptains.length ? stats.mostPopularCaptains.map((driver) => (
                <div key={driver.driverId} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
                  <div>
                    <div className="font-black">{driver.label}</div>
                    <div className="text-sm text-track-muted">{driver.teamName}</div>
                  </div>
                  <div className="text-sm font-black">{formatNumber(driver.count)} · {percent(driver.percentage)}</div>
                </div>
              )) : <p className="text-track-muted">No captain data yet.</p>}
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-black">Most popular vice-captains</h2>
            <div className="mt-3 space-y-2">
              {stats.mostPopularViceCaptains.length ? stats.mostPopularViceCaptains.map((driver) => (
                <div key={driver.driverId} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
                  <div>
                    <div className="font-black">{driver.label}</div>
                    <div className="text-sm text-track-muted">{driver.teamName}</div>
                  </div>
                  <div className="text-sm font-black">{formatNumber(driver.count)} · {percent(driver.percentage)}</div>
                </div>
              )) : <p className="text-track-muted">No vice-captain data yet.</p>}
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-black">Top leagues by members</h2>
            <div className="mt-3 space-y-2">
              {stats.topLeagues.length ? stats.topLeagues.map(({ league, count }) => (
                <div key={league.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
                  <div>
                    <div className="font-black">{league.name}</div>
                    <div className="text-sm text-track-muted">Code {league.share_code}</div>
                  </div>
                  <div className="text-sm font-black">{formatNumber(count)} members</div>
                </div>
              )) : <p className="text-track-muted">No leagues created yet.</p>}
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-black">Recent signup days</h2>
            <div className="mt-3 space-y-2">
              {stats.signupsByDay.length ? stats.signupsByDay.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <span className="font-bold">{label}</span>
                  <span className="font-black">{formatNumber(count)}</span>
                </div>
              )) : <p className="text-track-muted">No signup data yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
