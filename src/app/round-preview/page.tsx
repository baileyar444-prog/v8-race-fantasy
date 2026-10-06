"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LockoutCountdown } from "@/components/LockoutCountdown";
import { createClient } from "@/lib/supabase/browser";
import { categories, fallbackDrivers } from "@/lib/mock-data";
import { friendlyDataError } from "@/lib/friendly-error";

type EventRow = {
  id: string;
  name: string | null;
  full_name: string | null;
  lockout_at: string | null;
  manual_lock: boolean | null;
  number_of_races: number | null;
  event_multiplier: number | null;
};

type Driver = {
  id: string;
  driver_name: string;
  team_name: string;
  car_number: string;
  category: string;
  points_position: number;
  championship_points: number;
  wins: number;
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
      category: string | null;
    } | null;
  }[];
};

type PickStat = {
  driverId: string;
  driverName: string;
  teamName: string;
  carNumber: string;
  category: string;
  picks: number;
  captains: number;
  viceCaptains: number;
  ownership: number;
  captaincy: number;
  viceCaptaincy: number;
};

function percent(value: number) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export default function RoundPreviewPage() {
  const supabase = createClient();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>(fallbackDrivers as Driver[]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { count: profileCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });

        if (typeof profileCount === "number") setRegisteredPlayers(profileCount);

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id,name,full_name,lockout_at,manual_lock,number_of_races,event_multiplier")
          .eq("is_open_event", true)
          .maybeSingle();

        if (eventError) throw eventError;

        if (eventData) {
          setEvent(eventData as EventRow);

          const { data: teamData, error: teamError } = await supabase
            .from("fantasy_teams")
            .select("id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(driver_id,drivers(driver_name,team_name,car_number,category))")
            .eq("event_id", eventData.id);

          if (teamError) throw teamError;
          setTeams((teamData ?? []) as unknown as EventTeam[]);
        }

        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("id,driver_name,team_name,car_number,category,points_position,championship_points,wins")
          .eq("is_active", true)
          .order("points_position");

        if (driverError) throw driverError;
        if (driverData?.length) setDrivers(driverData as Driver[]);
      } catch (error) {
        setErrorMessage(friendlyDataError(error, "Could not load the live Bathurst pick statistics."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  const stats = useMemo(() => {
    const totals: Record<string, PickStat> = {};
    const totalTeams = teams.length || 1;

    for (const team of teams) {
      for (const pick of team.fantasy_team_picks ?? []) {
        if (!pick.driver_id) continue;

        const fallback = drivers.find((driver) => driver.id === pick.driver_id);

        const existing = totals[pick.driver_id] ?? {
          driverId: pick.driver_id,
          driverName: pick.drivers?.driver_name ?? fallback?.driver_name ?? "Unknown driver",
          teamName: pick.drivers?.team_name ?? fallback?.team_name ?? "—",
          carNumber: pick.drivers?.car_number ?? fallback?.car_number ?? "—",
          category: pick.drivers?.category ?? fallback?.category ?? "—",
          picks: 0,
          captains: 0,
          viceCaptains: 0,
          ownership: 0,
          captaincy: 0,
          viceCaptaincy: 0
        };

        existing.picks += 1;
        if (pick.driver_id === team.captain_driver_id) existing.captains += 1;
        if (pick.driver_id === team.vice_captain_driver_id) existing.viceCaptains += 1;

        totals[pick.driver_id] = existing;
      }
    }

    return Object.values(totals)
      .map((item) => ({
        ...item,
        ownership: Math.round((item.picks / totalTeams) * 1000) / 10,
        captaincy: Math.round((item.captains / totalTeams) * 1000) / 10,
        viceCaptaincy: Math.round((item.viceCaptains / totalTeams) * 1000) / 10
      }))
      .sort((a, b) => b.picks - a.picks || b.captains - a.captains || a.driverName.localeCompare(b.driverName));
  }, [teams, drivers]);

  const allDriverStats = useMemo(() => {
    const byId = new Map(stats.map((item) => [item.driverId, item]));

    return drivers.map((driver) => byId.get(driver.id) ?? {
      driverId: driver.id,
      driverName: driver.driver_name,
      teamName: driver.team_name,
      carNumber: driver.car_number,
      category: driver.category,
      picks: 0,
      captains: 0,
      viceCaptains: 0,
      ownership: 0,
      captaincy: 0,
      viceCaptaincy: 0
    });
  }, [stats, drivers]);

  const mostPicked = [...allDriverStats]
    .sort((a, b) => b.ownership - a.ownership || b.captaincy - a.captaincy || a.driverName.localeCompare(b.driverName))
    .slice(0, 6);
  const mostCaptained = [...allDriverStats]
    .sort((a, b) => b.captaincy - a.captaincy || b.ownership - a.ownership || a.driverName.localeCompare(b.driverName))
    .slice(0, 5);
  const mostViceCaptained = [...allDriverStats]
    .sort((a, b) => b.viceCaptaincy - a.viceCaptaincy || b.ownership - a.ownership || a.driverName.localeCompare(b.driverName))[0] ?? null;
  const leastPicked = [...allDriverStats]
    .sort((a, b) => a.ownership - b.ownership || a.driverName.localeCompare(b.driverName));
  const differentials = leastPicked.filter((item) => item.ownership <= 15).slice(0, 6);

  const byCategory = categories.map((category) => ({
    category,
    top: stats.filter((item) => item.category === category).slice(0, 3)
  }));

  if (loading) return <div className="card">Loading round preview...</div>;

  const eventName = event?.name ?? event?.full_name ?? "Open round";
  const isBathurst = eventName.toLowerCase().includes("bathurst") || Number(event?.event_multiplier ?? 1) === 2;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Round preview" title={`${eventName} Fantasy Preview`}>
        {isBathurst ? "Current Bathurst picks, captaincy trends and differentials. Bathurst is double points." : "See the most picked drivers, captain favourites and possible differentials before lockout."}
      </PageHeader>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <section className="card border-track-orange/25 bg-track-orange/10">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <div className="pill mb-3">{isBathurst ? "Bathurst special · 2x points" : "Open event"}</div>
            <h2 className="text-3xl font-black">{eventName}</h2>
            <p className="mt-2 text-track-muted">
              {registeredPlayers ?? 150} registered players · {teams.length} current {eventName} team{teams.length === 1 ? "" : "s"} saved · {event?.number_of_races ?? "—"} race{event?.number_of_races === 1 ? "" : "s"}{Number(event?.event_multiplier ?? 1) === 2 ? " · 2x fantasy points" : ""}{isBathurst ? " · Locks Fri 9 Oct · 3:15 PM AEST" : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn btn-primary" href="/pick-team">Pick team</Link>
              <Link className="btn" href="/share-team">Share my team</Link>
              <Link className="btn" href="/leagues?join=GRID88">Join GRID88</Link>
            </div>
          </div>
          <LockoutCountdown lockoutAt={event?.lockout_at} manualLock={event?.manual_lock} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-track-orange/25 bg-track-orange/10 p-4">
          <div className="text-xs font-black uppercase tracking-[.16em] text-track-muted">Most picked</div>
          <div className="mt-1 font-black">{mostPicked[0] ? `#${mostPicked[0].carNumber} ${mostPicked[0].driverName}` : "No picks yet"}</div>
          <div className="mt-1 text-sm text-orange-100">{mostPicked[0] ? percent(mostPicked[0].ownership) : "0.0%"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-black uppercase tracking-[.16em] text-track-muted">Captain favourite</div>
          <div className="mt-1 font-black">{mostCaptained[0] ? `#${mostCaptained[0].carNumber} ${mostCaptained[0].driverName}` : "No captains yet"}</div>
          <div className="mt-1 text-sm text-orange-100">{mostCaptained[0] ? `${percent(mostCaptained[0].captaincy)} C` : "0.0%"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-black uppercase tracking-[.16em] text-track-muted">Vice favourite</div>
          <div className="mt-1 font-black">{mostViceCaptained ? `#${mostViceCaptained.carNumber} ${mostViceCaptained.driverName}` : "No vice picks yet"}</div>
          <div className="mt-1 text-sm text-orange-100">{mostViceCaptained ? `${percent(mostViceCaptained.viceCaptaincy)} VC` : "0.0%"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-black uppercase tracking-[.16em] text-track-muted">Least picked</div>
          <div className="mt-1 font-black">{leastPicked[0] ? `#${leastPicked[0].carNumber} ${leastPicked[0].driverName}` : "No data yet"}</div>
          <div className="mt-1 text-sm text-orange-100">{leastPicked[0] ? percent(leastPicked[0].ownership) : "0.0%"}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-xl font-black">{isBathurst ? "Bathurst most picked" : "Most picked"}</h2>
          <div className="mt-4 space-y-2">
            {mostPicked.length ? mostPicked.map((item, index) => (
              <div key={item.driverId} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">#{index + 1} · Category {item.category}</div>
                    <div className="font-black">#{item.carNumber} {item.driverName}</div>
                    <div className="text-xs text-track-muted">{item.teamName}</div>
                  </div>
                  <span className="pill">{percent(item.ownership)}</span>
                </div>
              </div>
            )) : <p className="text-track-muted">No team data yet.</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black">{isBathurst ? "Bathurst captain favourites" : "Captain favourites"}</h2>
          <div className="mt-4 space-y-2">
            {mostCaptained.length ? mostCaptained.map((item, index) => (
              <div key={item.driverId} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">#{index + 1} · Category {item.category}</div>
                    <div className="font-black">#{item.carNumber} {item.driverName}</div>
                    <div className="text-xs text-track-muted">{item.teamName}</div>
                  </div>
                  <span className="pill">{percent(item.captaincy)} C</span>
                </div>
              </div>
            )) : <p className="text-track-muted">Captain stats appear once teams are saved.</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black">Least picked / differentials</h2>
          <div className="mt-4 space-y-2">
            {differentials.map((item) => (
              <div key={item.driverId} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">Category {item.category}</div>
                    <div className="font-black">#{item.carNumber} {item.driverName}</div>
                    <div className="text-xs text-track-muted">{item.teamName}</div>
                  </div>
                  <span className="pill">{percent(item.ownership)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">Category ownership</h2>
        <p className="mt-1 text-sm text-track-muted">Current Bathurst ownership leaders by category, based on saved teams.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {byCategory.map((group) => (
            <div key={group.category} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-xl font-black">Category {group.category}</div>
              {group.top.length ? group.top.map((item) => (
                <div key={item.driverId} className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3">
                  <span className="font-bold">#{item.carNumber} {item.driverName}</span>
                  <span className="text-sm font-black text-orange-100">{percent(item.ownership)}</span>
                </div>
              )) : <div className="text-sm text-track-muted">No picks yet.</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
