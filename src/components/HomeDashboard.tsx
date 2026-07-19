"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LockoutCountdown, isLocked } from "@/components/LockoutCountdown";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { upcomingEventSlugs } from "@/lib/mock-data";

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

type PopularDriver = {
  driverId: string;
  driverName: string;
  teamName: string;
  carNumber: string;
  picks: number;
  captains: number;
  viceCaptains: number;
  ownership: number;
};

type ScoreRow = {
  user_id: string;
  event_id: string;
  published_score: number | null;
};

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
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
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
        .select("id,name,full_name,lockout_at,manual_lock,is_open_event")
        .in("slug", [...upcomingEventSlugs]);

      const currentEventIds = (eventRows ?? []).map((event) => event.id);
      setScoreEventIds(currentEventIds);

      const eventData = (eventRows ?? []).find((event) => event.is_open_event) ?? null;

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
        const { data: eventTeamData } = await supabase
          .from("fantasy_teams")
          .select("id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(driver_id,drivers(driver_name,team_name,car_number))")
          .eq("event_id", eventData.id);

        setEventTeams((eventTeamData ?? []) as unknown as EventTeam[]);

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

  const popularDrivers = useMemo<PopularDriver[]>(() => {
    const totals: Record<string, PopularDriver> = {};
    const totalTeams = eventTeams.length || 1;

    for (const team of eventTeams) {
      for (const pick of team.fantasy_team_picks ?? []) {
        if (!pick.driver_id) continue;

        const existing = totals[pick.driver_id] ?? {
          driverId: pick.driver_id,
          driverName: pick.drivers?.driver_name ?? "Unknown driver",
          teamName: pick.drivers?.team_name ?? "—",
          carNumber: pick.drivers?.car_number ?? "—",
          picks: 0,
          captains: 0,
          viceCaptains: 0,
          ownership: 0
        };

        existing.picks += 1;
        if (pick.driver_id === team.captain_driver_id) existing.captains += 1;
        if (pick.driver_id === team.vice_captain_driver_id) existing.viceCaptains += 1;

        totals[pick.driver_id] = existing;
      }
    }

    return Object.values(totals)
      .map((item) => ({ ...item, ownership: Math.round((item.picks / totalTeams) * 100) }))
      .sort((a, b) => {
        if (b.picks !== a.picks) return b.picks - a.picks;
        if (b.captains !== a.captains) return b.captains - a.captains;
        return a.driverName.localeCompare(b.driverName);
      })
      .slice(0, 4);
  }, [eventTeams]);

  const captainFavourite = useMemo(() => {
    return [...popularDrivers].sort((a, b) => b.captains - a.captains)[0] ?? null;
  }, [popularDrivers]);

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
  const status = statusForOpenEvent(openEvent, team, teamPicks.length);
  const teamComplete = teamPicks.length >= 6;

  return (
    <div className="card" style={{ background: profile.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}22, rgba(17,24,39,.86))` : undefined }}>
      <div className="grid gap-4 xl:grid-cols-[1fr_300px] xl:items-start">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Shield
              number={profile.shield_number ?? 88}
              baseColour={profile.shield_base_colour ?? "#ff7a1a"}
              patternColour={profile.shield_pattern_colour ?? "#111827"}
              pattern={profile.shield_pattern ?? "chevron"}
              size={76}
            />
            <div>
              <div className="pill mb-2">Logged in</div>
              <h2 className="text-3xl font-black">{profile.garage_name ?? "Your Garage"}</h2>
              <p className="text-track-muted">{profile.display_name ?? "Manager"} · {eventName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <Link className="rounded-2xl bg-track-orange px-4 py-3 text-center text-sm font-black text-black shadow-glow hover:bg-orange-300" href="/pick-team">Edit team</Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black hover:bg-white/10" href="/team-history">My Team</Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black hover:bg-white/10" href="/leaderboard">Ladder</Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black hover:bg-white/10" href="/team-history">History</Link>
          </div>
        </div>

        <LockoutCountdown lockoutAt={openEvent?.lockout_at} manualLock={openEvent?.manual_lock} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 lg:col-span-2">
          <div className="pill mb-2">{status.label}</div>
          <p className="text-sm font-bold text-track-muted">{status.text}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-black text-track-muted">Overall rank</div>
          <div className="mt-1 text-3xl font-black">{formatRank(rankStats.rank)}</div>
          <p className="text-xs text-track-muted">{Math.round(rankStats.total)} total pts · {rankStats.rankedManagers} ranked</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-black text-track-muted">Current round</div>
          <div className="mt-1 text-2xl font-black">{teamComplete ? "6/6" : `${teamPicks.length}/6`}</div>
          <p className="text-xs text-track-muted">{teamComplete ? "Team saved" : "Drivers selected"}</p>
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-xl font-black">Current round fantasy stats</h3>
            <p className="text-sm text-track-muted">Ownership, captain favourites and differentials for the open event.</p>
          </div>
          <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10" href="/pick-team">
            Use stats to pick
          </Link>
        </div>

        {popularDrivers.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {popularDrivers.map((driver, index) => (
              <div key={driver.driverId} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-black text-track-muted">#{index + 1} most picked</div>
                  <span className="pill">{driver.ownership}%</span>
                </div>
                <div className="mt-2 font-black">#{driver.carNumber} {driver.driverName}</div>
                <div className="mt-1 text-xs text-track-muted">{driver.teamName}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                  <div className="rounded-xl bg-black/20 p-2"><div>{driver.picks}</div><div className="text-track-muted">Picks</div></div>
                  <div className="rounded-xl bg-black/20 p-2"><div>{driver.captains}</div><div className="text-track-muted">C</div></div>
                  <div className="rounded-xl bg-black/20 p-2"><div>{driver.viceCaptains}</div><div className="text-track-muted">VC</div></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-track-muted">
            Popular pick stats will appear once managers save teams for {eventName}.
          </div>
        )}

        {captainFavourite ? (
          <div className="mt-3 rounded-2xl border border-track-orange/25 bg-track-orange/10 p-3 text-sm">
            <span className="font-black text-orange-100">Captain favourite:</span>{" "}
            #{captainFavourite.carNumber} {captainFavourite.driverName} with {captainFavourite.captains} captain pick{captainFavourite.captains === 1 ? "" : "s"}.
          </div>
        ) : null}
      </section>

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
