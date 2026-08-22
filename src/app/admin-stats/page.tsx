"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";
import { upcomingEventSlugs } from "@/lib/mock-data";

type Profile = {
  id: string;
  email: string | null;
  created_at: string | null;
  display_name: string | null;
  garage_name: string | null;
  role: string | null;
  last_seen_at: string | null;
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
  status?: string | null;
  source_event_id?: string | null;
  source_event_name?: string | null;
  carried_forward_at?: string | null;
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
  status?: string | null;
};

type ActivityDay = {
  user_id: string;
  activity_date: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  heartbeat_count: number | null;
};

type PopularDriver = {
  driverId: string;
  label: string;
  teamName: string;
  count: number;
  percentage: number;
};

const BASELINE_MISSED_TEAM_POINTS = 150;

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

function exactTimestamp(value: string | null | undefined) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short"
  }).format(new Date(value));
}

function brisbaneDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function activityDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function activityStatus(value: string | null | undefined) {
  if (!value) return "Never active";

  const lastSeen = new Date(value);
  const minutesAgo = (Date.now() - lastSeen.getTime()) / 60000;

  if (minutesAgo < 2) return "Online now";
  if (brisbaneDateKey(lastSeen) === brisbaneDateKey()) return "Active today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (brisbaneDateKey(lastSeen) === brisbaneDateKey(yesterday)) return "Active yesterday";

  return `Last active ${dayLabel(value)}`;
}

function isOnlineNow(value: string | null | undefined) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 2 * 60 * 1000;
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
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);
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
          scoreResult,
          activityResult
        ] = await Promise.all([
          supabase.from("profiles").select("id,email,created_at,display_name,garage_name,role,last_seen_at").order("created_at", { ascending: true }),
          supabase.from("events").select("id,slug,name,sort_order,is_open_event,lockout_at,manual_lock").in("slug", [...upcomingEventSlugs]).order("sort_order"),
          supabase.from("drivers").select("id,driver_name,car_number,team_name,category").eq("is_active", true),
          supabase.from("leagues").select("id,name,share_code,created_at").order("created_at", { ascending: false }),
          supabase.from("league_members").select("league_id,user_id"),
          supabase.from("fantasy_teams").select("id,user_id,event_id,captain_driver_id,vice_captain_driver_id,submitted_at,status,source_event_id,source_event_name,carried_forward_at"),
          supabase.from("fantasy_team_picks").select("fantasy_team_id,category,driver_id,drivers(driver_name,car_number,team_name)"),
          supabase.from("fantasy_scores").select("user_id,event_id,published_score,picks_count,status"),
          supabase.from("user_activity_days").select("user_id,activity_date,first_seen_at,last_seen_at,heartbeat_count").order("activity_date", { ascending: false }).limit(1200)
        ]);

        if (profileResult.error) throw profileResult.error;
        if (eventResult.error) throw eventResult.error;
        if (driverResult.error) throw driverResult.error;
        if (leagueResult.error) throw leagueResult.error;
        if (leagueMemberResult.error) throw leagueMemberResult.error;
        if (teamResult.error) throw teamResult.error;
        if (pickResult.error) throw pickResult.error;
        if (scoreResult.error) throw scoreResult.error;
        if (activityResult.error) throw activityResult.error;

        setProfiles((profileResult.data ?? []) as Profile[]);
        setEvents((eventResult.data ?? []) as EventRow[]);
        setDrivers((driverResult.data ?? []) as Driver[]);
        setLeagues((leagueResult.data ?? []) as League[]);
        setLeagueMembers((leagueMemberResult.data ?? []) as LeagueMember[]);
        setTeams((teamResult.data ?? []) as FantasyTeam[]);
        setPicks((pickResult.data ?? []) as unknown as FantasyPick[]);
        setScores((scoreResult.data ?? []) as Score[]);
        setActivityDays((activityResult.data ?? []) as ActivityDay[]);
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

    const activityByDay = new Map<string, { date: string; users: Set<string>; heartbeats: number; lastSeenAt: string | null }>();

    for (const row of activityDays) {
      const existing = activityByDay.get(row.activity_date) ?? {
        date: row.activity_date,
        users: new Set<string>(),
        heartbeats: 0,
        lastSeenAt: null
      };

      existing.users.add(row.user_id);
      existing.heartbeats += Number(row.heartbeat_count ?? 0);

      if (row.last_seen_at && (!existing.lastSeenAt || new Date(row.last_seen_at).getTime() > new Date(existing.lastSeenAt).getTime())) {
        existing.lastSeenAt = row.last_seen_at;
      }

      activityByDay.set(row.activity_date, existing);
    }

    const dailyActiveAccounts = [...activityByDay.values()]
      .map((row) => ({
        date: row.date,
        accountCount: row.users.size,
        heartbeats: row.heartbeats,
        lastSeenAt: row.lastSeenAt
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    const latestActivityByUser = new Map<string, string>();

    for (const row of activityDays) {
      if (!row.last_seen_at) continue;
      const existing = latestActivityByUser.get(row.user_id);
      if (!existing || new Date(row.last_seen_at).getTime() > new Date(existing).getTime()) {
        latestActivityByUser.set(row.user_id, row.last_seen_at);
      }
    }

    const accountActivity = profiles
      .map((profile) => ({
        ...profile,
        latestActivity: profile.last_seen_at ?? latestActivityByUser.get(profile.id) ?? null,
        onlineNow: isOnlineNow(profile.last_seen_at ?? latestActivityByUser.get(profile.id))
      }))
      .sort((a, b) => {
        if (!a.latestActivity && !b.latestActivity) return (a.email ?? a.garage_name ?? "").localeCompare(b.email ?? b.garage_name ?? "");
        if (!a.latestActivity) return 1;
        if (!b.latestActivity) return -1;
        return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime();
      });

    const todayKey = brisbaneDateKey();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoKey = brisbaneDateKey(sevenDaysAgo);

    const activeToday = dailyActiveAccounts.find((row) => row.date === todayKey)?.accountCount ?? 0;
    const activeLast7Days = new Set(activityDays.filter((row) => row.activity_date >= sevenDaysAgoKey).map((row) => row.user_id)).size;

    const openEventForStats = events.find((event) => event.is_open_event) ?? null;
    const eventById = new Map(events.map((event) => [event.id, event]));
    const openEventTeams = openEventForStats ? currentTeams.filter((team) => team.event_id === openEventForStats.id) : [];
    const explicitOpenTeams = openEventTeams.filter((team) => team.status !== "carried_forward");
    const carriedOpenTeams = openEventTeams.filter((team) => team.status === "carried_forward");
    const openTeamUserIds = new Set(openEventTeams.map((team) => team.user_id));
    const explicitOpenTeamUserIds = new Set(explicitOpenTeams.map((team) => team.user_id));
    const latestPreviousTeamByUser = new Map<string, { team: FantasyTeam; eventName: string; sortOrder: number }>();

    if (openEventForStats) {
      for (const team of currentTeams) {
        const event = eventById.get(team.event_id);
        if (!event || event.sort_order >= openEventForStats.sort_order) continue;

        const sourceEventName = team.source_event_name ?? eventById.get(team.source_event_id ?? "")?.name ?? event.name;
        const existing = latestPreviousTeamByUser.get(team.user_id);
        if (!existing || event.sort_order > existing.sortOrder) {
          latestPreviousTeamByUser.set(team.user_id, { team, eventName: sourceEventName, sortOrder: event.sort_order });
        }
      }
    }

    const pendingCarryForwardProfiles = openEventForStats
      ? profiles.filter((profile) => !openTeamUserIds.has(profile.id) && latestPreviousTeamByUser.has(profile.id))
      : [];
    const pendingBaselineProfiles = openEventForStats
      ? profiles.filter((profile) => !openTeamUserIds.has(profile.id) && !latestPreviousTeamByUser.has(profile.id))
      : [];

    const loggedInNoOpenSave = accountActivity
      .filter((profile) => Boolean(profile.latestActivity) && !explicitOpenTeamUserIds.has(profile.id))
      .map((profile) => {
        const currentTeam = openEventTeams.find((team) => team.user_id === profile.id) ?? null;
        const previous = latestPreviousTeamByUser.get(profile.id) ?? null;
        return {
          ...profile,
          currentTeamStatus: currentTeam?.status ?? null,
          latestPreviousEvent: currentTeam?.status === "carried_forward"
            ? currentTeam.source_event_name ?? previous?.eventName ?? "Previous round"
            : previous?.eventName ?? null,
          outcome: currentTeam?.status === "carried_forward"
            ? `Continued from ${currentTeam.source_event_name ?? previous?.eventName ?? "previous round"}`
            : previous
              ? `Will continue from ${previous.eventName}`
              : `Would receive ${BASELINE_MISSED_TEAM_POINTS} baseline`
        };
      })
      .sort((a, b) => {
        const aTime = a.latestActivity ? new Date(a.latestActivity).getTime() : 0;
        const bTime = b.latestActivity ? new Date(b.latestActivity).getTime() : 0;
        return bTime - aTime;
      });

    const totalPublishedPoints = currentScores.reduce((sum, score) => sum + Number(score.published_score ?? 0), 0);
    const scoredUsers = new Set(currentScores.filter((score) => Number(score.published_score ?? 0) > 0).map((score) => score.user_id));

    return {
      currentTeams,
      currentPicks,
      currentScores,
      accountCount: profiles.length,
      onlineNowCount: accountActivity.filter((profile) => profile.onlineNow).length,
      activeToday,
      activeLast7Days,
      accountActivity,
      dailyActiveAccounts,
      openEventForStats,
      explicitOpenTeamCount: explicitOpenTeams.length,
      carriedOpenTeamCount: carriedOpenTeams.length,
      pendingCarryForwardCount: pendingCarryForwardProfiles.length,
      pendingBaselineCount: pendingBaselineProfiles.length,
      loggedInNoOpenSave,
      adminCount: profiles.filter((profile) => profile.role === "admin").length,
      garageCount: profiles.filter((profile) => Boolean(profile.garage_name)).length,
      leagueCount: leagues.length,
      leagueMemberCount: leagueMembers.length,
      averageLeagueSize: leagues.length ? leagueMembers.length / leagues.length : 0,
      teamSubmissionCount: currentTeams.length,
      uniqueManagersWithTeams: new Set(currentTeams.map((team) => team.user_id)).size,
      scoredManagers: scoredUsers.size,
      baselineScoreCount: currentScores.filter((score) => score.status === "baseline").length,
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
  }, [profiles, events, drivers, leagues, leagueMembers, teams, picks, scores, activityDays]);

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
    { label: "Drivers loaded", ok: drivers.length >= 26, detail: `${drivers.length} active drivers visible` },
    { label: "Saved teams for open event", ok: openEventTeams.length > 0, detail: `${openEventTeams.length} teams currently attached to the open event` },
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
        Track account signups, last activity, daily active accounts, league creation, team submissions and popular driver picks.
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

      <section className="card border-track-orange/25 bg-track-orange/10">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Missed-team baselines</div>
            <div className="mt-2 text-3xl font-black">{formatNumber(stats.baselineScoreCount)}</div>
            <p className="mt-2 text-sm text-track-muted">Published 150-point baseline scores for accounts that missed a locked round.</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <div className="pill mb-3">Upcoming round team status</div>
            <h2 className="text-2xl font-black">{stats.openEventForStats?.name ?? "Open event"}</h2>
            <p className="mt-1 text-sm text-track-muted">Saved teams, pending carry-forwards and logged-in accounts that have not saved the upcoming round.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-black text-track-muted">Saved for upcoming</div>
            <div className="mt-1 text-3xl font-black">{formatNumber(stats.explicitOpenTeamCount)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-black text-track-muted">Already continued</div>
            <div className="mt-1 text-3xl font-black">{formatNumber(stats.carriedOpenTeamCount)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-black text-track-muted">Will continue</div>
            <div className="mt-1 text-3xl font-black">{formatNumber(stats.pendingCarryForwardCount)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-black text-track-muted">Would get baseline</div>
            <div className="mt-1 text-3xl font-black">{formatNumber(stats.pendingBaselineCount)}</div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <h3 className="mb-2 text-xl font-black">Logged in but no upcoming team saved</h3>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-track-muted">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Garage</th>
                <th className="p-3">Last active</th>
                <th className="p-3">Latest round saved</th>
                <th className="p-3">What will happen</th>
              </tr>
            </thead>
            <tbody>
              {stats.loggedInNoOpenSave.length ? stats.loggedInNoOpenSave.map((profile) => (
                <tr key={profile.id} className="border-t border-white/10">
                  <td className="p-3 font-bold">{profile.email ?? "—"}</td>
                  <td className="p-3 text-track-muted">{profile.garage_name ?? profile.display_name ?? "—"}</td>
                  <td className="p-3 text-track-muted">{exactTimestamp(profile.latestActivity)}</td>
                  <td className="p-3 text-track-muted">{profile.latestPreviousEvent ?? "No previous team"}</td>
                  <td className="p-3 font-bold text-orange-100">{profile.outcome}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-3 text-track-muted">Everyone who has logged in has saved the upcoming round.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card">
          <h2 className="text-2xl font-black">Most popular picks per race weekend</h2>
          <div className="mt-4 space-y-4">
            {stats.popularByEvent.map(({ event, teamCount, popular }) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-black">{event.name}</h3>
                    <p className="text-sm text-track-muted">Driver ownership shown as percentages.</p>
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
                        <div className="text-sm font-black">{percent(driver.percentage)}</div>
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
                  <div className="text-sm font-black">{percent(driver.percentage)}</div>
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
                  <div className="text-sm font-black">{percent(driver.percentage)}</div>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card border-green-400/20 bg-green-500/10">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Online now</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.onlineNowCount)}</div>
          <p className="mt-2 text-sm text-track-muted">Approx. active in the last 2 minutes.</p>
        </div>
        <div className="card">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Active today</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.activeToday)}</div>
          <p className="mt-2 text-sm text-track-muted">Unique accounts seen today, Brisbane/AEST date.</p>
        </div>
        <div className="card">
          <div className="text-sm font-black uppercase tracking-[.18em] text-track-muted">Active last 7 days</div>
          <div className="mt-2 text-4xl font-black">{formatNumber(stats.activeLast7Days)}</div>
          <p className="mt-2 text-sm text-track-muted">Unique accounts seen across the last 7 days.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
        <section className="card overflow-x-auto">
          <div className="mb-4">
            <h2 className="text-2xl font-black">Account activity</h2>
            <p className="mt-1 text-sm text-track-muted">Admin-only list showing when every account was last active.</p>
          </div>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-track-muted">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Garage</th>
                <th className="p-3">Last active</th>
                <th className="p-3">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {stats.accountActivity.map((profile) => (
                <tr key={profile.id} className="border-t border-white/10">
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${profile.onlineNow ? "bg-green-500/15 text-green-100" : "bg-white/5 text-track-muted"}`}>
                      <span className={`h-2 w-2 rounded-full ${profile.onlineNow ? "bg-green-400" : "bg-white/30"}`} />
                      {activityStatus(profile.latestActivity)}
                    </span>
                  </td>
                  <td className="p-3 font-bold">{profile.email ?? "—"}</td>
                  <td className="p-3 text-track-muted">{profile.display_name ?? "—"}</td>
                  <td className="p-3 text-track-muted">{profile.garage_name ?? "—"}</td>
                  <td className="p-3 text-track-muted">{exactTimestamp(profile.latestActivity)}</td>
                  <td className="p-3 text-track-muted">{exactTimestamp(profile.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="mb-4">
            <h2 className="text-2xl font-black">Accounts online per day</h2>
            <p className="mt-1 text-sm text-track-muted">Unique accounts seen each Brisbane/AEST day.</p>
          </div>
          <div className="space-y-2">
            {stats.dailyActiveAccounts.length ? stats.dailyActiveAccounts.map((row) => (
              <div key={row.date} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{activityDateLabel(row.date)}</span>
                  <span className="text-lg font-black">{formatNumber(row.accountCount)}</span>
                </div>
                <div className="mt-1 text-xs text-track-muted">
                  {formatNumber(row.heartbeats)} activity pings · last seen {exactTimestamp(row.lastSeenAt)}
                </div>
              </div>
            )) : (
              <p className="text-track-muted">No daily activity rows yet. Run the activity stats SQL, deploy this version, then users will be counted as they visit.</p>
            )}
          </div>
        </section>
      </div>


    </div>
  );
}
