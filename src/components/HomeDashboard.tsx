"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LockoutCountdown, isLocked } from "@/components/LockoutCountdown";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { fallbackDrivers, upcomingEventSlugs } from "@/lib/mock-data";
import { InviteMatesPrompt } from "@/components/InviteMatesPrompt";
import { selectCurrentEvent } from "@/lib/current-event";
import { fetchEventPickStats, type LivePickStat } from "@/lib/live-pick-stats";

type Profile = {
  id?: string;
  display_name: string | null;
  garage_name: string | null;
  banner_colour: string | null;
  shield_base_colour: string | null;
  shield_pattern_colour: string | null;
  shield_pattern: string | null;
  shield_number: number | null;
};

type OpenEvent = {
  id: string;
  name: string | null;
  full_name: string | null;
  lockout_at: string | null;
  manual_lock: boolean | null;
};

type TeamRow = {
  id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
};

type TeamPick = {
  category: string;
  driver_id: string;
  drivers?: {
    driver_name: string;
    team_name: string;
    car_number: string;
  } | null;
};

type EventTeam = {
  id: string;
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

type ActiveDriver = {
  id: string;
  driver_name: string;
  team_name: string;
  car_number: string;
  points_position?: number | null;
};

type PopularDriver = {
  driverId: string;
  driverName: string;
  teamName: string;
  carNumber: string;
  picks: number;
  captains: number;
  viceCaptains: number;
  ownership: number;
  captaincy: number;
  viceCaptaincy: number;
};

type ScoreRow = {
  user_id: string;
  event_id: string;
  published_score: number | null;
};

function percent(value: number) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function statusForOpenEvent(openEvent: OpenEvent | null, team: TeamRow | null, picksCount: number) {
  if (!openEvent) return { label: "No open event", text: "Race Control needs to open the next round." };

  const locked = isLocked(openEvent.lockout_at, openEvent.manual_lock, Date.now());
  const eventName = openEvent.name ?? openEvent.full_name ?? "the open event";

  if (!team || picksCount === 0) {
    return locked
      ? { label: "Missed", text: `${eventName} is locked and no team is saved.` }
      : { label: "Next step", text: `Save your six-driver team for ${eventName} before lockout.` };
  }

  if (locked) {
    return { label: "Locked", text: `${eventName} is locked. Your saved team is now view-only.` };
  }

  return { label: "Team saved", text: `Your ${eventName} team is saved. You can still edit before lockout.` };
}

function formatRank(rank: number | null) {
  if (!rank) return "—";
  return `#${rank}`;
}

export function HomeDashboard() {
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openEvent, setOpenEvent] = useState<OpenEvent | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [teamPicks, setTeamPicks] = useState<TeamPick[]>([]);
  const [livePickStats, setLivePickStats] = useState<LivePickStat[]>([]);
  const [eventTeamCount, setEventTeamCount] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>(
    (fallbackDrivers as Array<ActiveDriver & { is_active?: boolean | null }>).filter((driver) => driver.is_active !== false)
  );
  const [allScores, setAllScores] = useState<ScoreRow[]>([]);
  const [scoreEventIds, setScoreEventIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoaded(true);
        return;
      }

      setUserId(userData.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,display_name,garage_name,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number")
        .eq("id", userData.user.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: eventRows } = await supabase
        .from("events")
        .select("id,slug,name,full_name,lockout_at,manual_lock,is_open_event,sort_order")
        .in("slug", [...upcomingEventSlugs]);

      const currentEventIds = (eventRows ?? []).map((event) => event.id);
      setScoreEventIds(currentEventIds);

      const { data: activeDriverData } = await supabase
        .from("drivers")
        .select("id,driver_name,team_name,car_number,points_position")
        .eq("is_active", true)
        .order("points_position");

      if (activeDriverData?.length) {
        setActiveDrivers(activeDriverData as ActiveDriver[]);
      }

      const eventData = selectCurrentEvent((eventRows ?? []) as OpenEvent[]);

      if (eventData) {
        setOpenEvent(eventData as OpenEvent);
      }

      const scoreQuery = supabase
        .from("fantasy_scores")
        .select("user_id,event_id,published_score");

      const { data: scoreData } = currentEventIds.length
        ? await scoreQuery.in("event_id", currentEventIds)
        : await scoreQuery;

      setAllScores((scoreData ?? []) as ScoreRow[]);

      if (eventData?.id) {
        try {
          const liveStats = await fetchEventPickStats(supabase, eventData.id);
          setLivePickStats(liveStats.rows);
          setEventTeamCount(liveStats.teamCount);
        } catch {
          setLivePickStats([]);
          setEventTeamCount(0);
        }

        const { data: teamData } = await supabase
          .from("fantasy_teams")
          .select("id,captain_driver_id,vice_captain_driver_id")
          .eq("user_id", userData.user.id)
          .eq("event_id", eventData.id)
          .maybeSingle();

        if (teamData?.id) {
          setTeam(teamData as TeamRow);

          const { data: pickData } = await supabase
            .from("fantasy_team_picks")
            .select("category,driver_id,drivers(driver_name,team_name,car_number)")
            .eq("fantasy_team_id", teamData.id)
            .order("category");

          setTeamPicks((pickData ?? []) as unknown as TeamPick[]);
        } else {
          setTeam(null);
          setTeamPicks([]);
        }
      }

      setLoaded(true);
    }

    load();
  }, [supabase]);

  const rankStats = useMemo(() => {
    const totals: Record<string, number> = {};

    const allowedEventIds = new Set(scoreEventIds);

    for (const score of allScores) {
      if (allowedEventIds.size && !allowedEventIds.has(score.event_id)) continue;
      totals[score.user_id] = (totals[score.user_id] ?? 0) + Number(score.published_score ?? 0);
    }

    const ranked = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([id, total], index) => ({ id, total, rank: index + 1 }));

    const mine = ranked.find((row) => row.id === userId);
    return {
      rank: mine?.rank ?? null,
      total: mine?.total ?? 0,
      rankedManagers: ranked.length
    };
  }, [allScores, scoreEventIds, userId]);

  const liveDriverStats = useMemo<PopularDriver[]>(() => {
    const byDriver = new Map(livePickStats.map((row) => [row.driverId, row]));

    return activeDrivers.map((driver) => {
      const row = byDriver.get(driver.id);
      return {
        driverId: driver.id,
        driverName: driver.driver_name,
        teamName: driver.team_name,
        carNumber: driver.car_number,
        picks: row?.pickedCount ?? 0,
        captains: row?.captainCount ?? 0,
        viceCaptains: row?.viceCount ?? 0,
        ownership: row?.pickedPercent ?? 0,
        captaincy: row?.captainPercent ?? 0,
        viceCaptaincy: row?.vicePercent ?? 0
      };
    });
  }, [livePickStats, activeDrivers]);

  const popularDrivers = useMemo(() => {
    return [...liveDriverStats]
      .sort((a, b) => b.ownership - a.ownership || b.captaincy - a.captaincy || a.driverName.localeCompare(b.driverName))
      .slice(0, 4);
  }, [liveDriverStats]);

  const captainFavourite = useMemo(() => {
    return [...liveDriverStats].sort((a, b) => b.captaincy - a.captaincy || b.ownership - a.ownership)[0] ?? null;
  }, [liveDriverStats]);

  const leastPickedDriver = useMemo(() => {
    if (!eventTeamCount) return null;
    return [...liveDriverStats].sort((a, b) => a.ownership - b.ownership || a.driverName.localeCompare(b.driverName))[0] ?? null;
  }, [liveDriverStats, eventTeamCount]);

  const viceFavourite = useMemo(() => {
    return [...liveDriverStats].sort((a, b) => b.viceCaptaincy - a.viceCaptaincy || b.ownership - a.ownership)[0] ?? null;
  }, [liveDriverStats]);

  if (!loaded) {
    return <div className="card">Loading your dashboard...</div>;
  }

  if (!profile) {
    return (
      <div className="card">
        <h2 className="text-2xl font-black">Create your garage</h2>
        <p className="mt-2 text-track-muted">
          Start by creating an account. Then you can build your badge, pick your drivers and join a league.
        </p>
        <Link className="btn btn-primary mt-4" href="/login">
          Create account
        </Link>
      </div>
    );
  }

  const eventName = openEvent?.name ?? openEvent?.full_name ?? "Open event";
  const finalsRound = ["gold coast", "sandown", "adelaide"].some((name) => eventName.toLowerCase().includes(name));
  const status = statusForOpenEvent(openEvent, team, teamPicks.length);
  const teamComplete = teamPicks.length >= 6;

  return (
    <div className={`card ${finalsRound ? "finals-divider" : ""}`} style={{ background: profile.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}22, rgba(17,24,39,.86))` : undefined }}>
      <div className="grid gap-4 xl:grid-cols-[1fr_300px] xl:items-start">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Shield
              number={profile.shield_number ?? 88}
              baseColour={profile.shield_base_colour ?? "#ff7a00"}
              patternColour={profile.shield_pattern_colour ?? "#111827"}
              pattern={profile.shield_pattern ?? "chevron"}
              size={64}
            />
            <div>
              <div className="pill mb-2">Logged in</div>
              <h2 className="text-2xl font-black sm:text-2xl">{profile.garage_name ?? "Your Garage"}</h2>
              <p className="text-track-muted">{profile.display_name ?? "Manager"} · {eventName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <Link className="rounded-xl bg-track-orange px-3 py-3 text-center text-sm font-black text-black shadow-glow hover:bg-orange-300 sm:rounded-2xl sm:px-4" href="/pick-team">{teamComplete ? "Edit team" : `Pick ${eventName}`}</Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm font-black hover:bg-white/10 sm:rounded-2xl sm:px-4" href="/team-history">History</Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm font-black hover:bg-white/10 sm:rounded-2xl sm:px-4" href="/leaderboard">Ladder</Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm font-black hover:bg-white/10 sm:rounded-2xl sm:px-4" href="/round-preview">Preview</Link>
          </div>
        </div>

        <LockoutCountdown lockoutAt={openEvent?.lockout_at} manualLock={openEvent?.manual_lock} />
      </div>

      <div className="mt-4 grid gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:rounded-2xl sm:p-4 lg:col-span-2">
          <div className={`pill mb-2 ${finalsRound ? "finals-pill" : ""}`}>{finalsRound ? "Supercars Finals" : status.label}</div>
          <p className="text-sm font-bold text-track-muted">{finalsRound ? `${status.text} The Finals are underway, so every pick matters.` : status.text}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-2xl sm:p-4">
          <div className="text-sm font-black text-track-muted">Overall rank</div>
          <div className="mt-1 text-2xl font-black sm:text-2xl">{formatRank(rankStats.rank)}</div>
          <p className="text-xs text-track-muted">{Math.round(rankStats.total)} total pts · {rankStats.rankedManagers} ranked</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-2xl sm:p-4">
          <div className="text-sm font-black text-track-muted">{finalsRound ? `${eventName} team` : "Current round"}</div>
          <div className="mt-1 text-2xl font-black">{teamComplete ? "6/6" : `${teamPicks.length}/6`}</div>
          <p className="text-xs text-track-muted">{teamComplete ? "Team saved" : "Drivers selected"}</p>
        </div>
      </div>

      <section className={`mt-5 rounded-3xl border bg-black/20 p-4 ${finalsRound ? "border-[#f6c453]/25" : "border-white/10"}`}>
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-xl font-black">{finalsRound ? `Current ${eventName} picks & stats` : "Current round fantasy stats"}</h3>
            <p className="text-sm text-track-muted">{finalsRound ? `Live ${eventName} ownership, captaincy and vice-captaincy trends for the Supercars Finals.` : "Ownership, captain favourites and differentials for the open event."}</p>
          </div>
          <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10" href="/pick-team">
            Use stats to pick
          </Link>
        </div>

        {eventTeamCount ? (
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="text-xs font-black uppercase tracking-[.12em] text-track-muted">Least picked</div>
              <div className="mt-1 font-black">{leastPickedDriver ? `#${leastPickedDriver.carNumber} ${leastPickedDriver.driverName}` : "—"}</div>
              <div className="text-orange-100">{leastPickedDriver ? percent(leastPickedDriver.ownership) : "0.0%"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="text-xs font-black uppercase tracking-[.12em] text-track-muted">Captain favourite</div>
              <div className="mt-1 font-black">{captainFavourite ? `#${captainFavourite.carNumber} ${captainFavourite.driverName}` : "—"}</div>
              <div className="text-orange-100">{captainFavourite ? `${percent(captainFavourite.captaincy)} C` : "0.0%"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="text-xs font-black uppercase tracking-[.12em] text-track-muted">Vice favourite</div>
              <div className="mt-1 font-black">{viceFavourite ? `#${viceFavourite.carNumber} ${viceFavourite.driverName}` : "—"}</div>
              <div className="text-orange-100">{viceFavourite ? `${percent(viceFavourite.viceCaptaincy)} VC` : "0.0%"}</div>
            </div>
          </div>
        ) : null}

        {eventTeamCount && popularDrivers.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {popularDrivers.map((driver, index) => (
              <div key={driver.driverId} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-black text-track-muted">#{index + 1} most picked</div>
                  <span className="pill">{percent(driver.ownership)}</span>
                </div>
                <div className="mt-2 font-black">#{driver.carNumber} {driver.driverName}</div>
                <div className="mt-1 text-xs text-track-muted">{driver.teamName}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                  <div className="rounded-xl bg-black/20 p-2"><div>{percent(driver.ownership)}</div><div className="text-track-muted">Picked</div></div>
                  <div className="rounded-xl bg-black/20 p-2"><div>{percent(driver.captaincy)}</div><div className="text-track-muted">C</div></div>
                  <div className="rounded-xl bg-black/20 p-2"><div>{percent(driver.viceCaptaincy)}</div><div className="text-track-muted">VC</div></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-track-muted">
            Live pick stats will appear once managers save teams for {eventName}.
          </div>
        )}

      </section>

      {teamPicks.length ? (
        <div className="mt-5">
          <InviteMatesPrompt compact />
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <h3 className="text-xl font-black">Saved team</h3>
          <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10" href="/team-history">
            View full team history
          </Link>
        </div>

        {teamPicks.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {teamPicks.map((pick) => {
              const isCaptain = pick.driver_id === team?.captain_driver_id;
              const isVice = pick.driver_id === team?.vice_captain_driver_id;

              return (
                <div key={pick.category} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="text-sm font-black text-track-muted">Category {pick.category}</div>
                    {isCaptain ? <span className="pill">C 2x</span> : isVice ? <span className="pill">VC 1.5x</span> : null}
                  </div>
                  <div className="font-black">#{pick.drivers?.car_number} {pick.drivers?.driver_name}</div>
                  <div className="mt-1 text-sm text-track-muted">{pick.drivers?.team_name}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-track-muted">
            No team saved for the open event yet. Go to Pick Team and save your six drivers before lockout.
          </div>
        )}
      </div>
    </div>
  );
}
