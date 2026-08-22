"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LockoutCountdown } from "@/components/LockoutCountdown";
import { createClient } from "@/lib/supabase/browser";
import { categories, fallbackDrivers } from "@/lib/mock-data";

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

export default function RoundPreviewPage() {
  const supabase = createClient();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>(fallbackDrivers as Driver[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { count: profileCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (typeof profileCount === "number") setRegisteredPlayers(profileCount);

      const { data: eventData } = await supabase
        .from("events")
        .select("id,name,full_name,lockout_at,manual_lock,number_of_races,event_multiplier")
        .eq("is_open_event", true)
        .maybeSingle();

      if (eventData) {
        setEvent(eventData as EventRow);

        const { data: teamData } = await supabase
          .from("fantasy_teams")
          .select("id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(driver_id,drivers(driver_name,team_name,car_number,category))")
          .eq("event_id", eventData.id);

        setTeams((teamData ?? []) as unknown as EventTeam[]);
      }

      const { data: driverData } = await supabase
        .from("drivers")
        .select("id,driver_name,team_name,car_number,category,points_position,championship_points,wins")
        .eq("is_active", true)
        .order("points_position");

      if (driverData?.length) setDrivers(driverData as Driver[]);
      setLoading(false);
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
        ownership: Math.round((item.picks / totalTeams) * 100),
        captaincy: Math.round((item.captains / totalTeams) * 100),
        viceCaptaincy: Math.round((item.viceCaptains / totalTeams) * 100)
      }))
      .sort((a, b) => b.picks - a.picks || b.captains - a.captains || a.driverName.localeCompare(b.driverName));
  }, [teams, drivers]);

  const mostPicked = stats.slice(0, 6);
  const mostCaptained = [...stats].sort((a, b) => b.captains - a.captains || b.picks - a.picks).slice(0, 5);
  const differentials = useMemo(() => {
    const pickedIds = new Set(stats.map((item) => item.driverId));
    const pickedDiffs = stats.filter((item) => item.ownership <= 15).sort((a, b) => a.ownership - b.ownership);
    const unpicked = drivers
      .filter((driver) => !pickedIds.has(driver.id))
      .map((driver) => ({
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
      }));

    return [...pickedDiffs, ...unpicked].slice(0, 6);
  }, [stats, drivers]);

  const byCategory = categories.map((category) => ({
    category,
    top: stats.filter((item) => item.category === category).slice(0, 3)
  }));

  if (loading) return <div className="card">Loading round preview...</div>;

  const eventName = event?.name ?? event?.full_name ?? "Open round";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Round preview" title={`${eventName} Fantasy Preview`}>
        See the most picked drivers, captain favourites and possible differentials before lockout.
      </PageHeader>

      <section className="card border-track-orange/25 bg-track-orange/10">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <div className="pill mb-3">Open event</div>
            <h2 className="text-4xl font-black">{eventName}</h2>
            <p className="mt-2 text-track-muted">
              {registeredPlayers ?? 150} registered players · {event?.number_of_races ?? "—"} race{event?.number_of_races === 1 ? "" : "s"}{Number(event?.event_multiplier ?? 1) === 2 ? " · double points" : ""}
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

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-2xl font-black">Most picked</h2>
          <div className="mt-4 space-y-2">
            {mostPicked.length ? mostPicked.map((item, index) => (
              <div key={item.driverId} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">#{index + 1} · Category {item.category}</div>
                    <div className="font-black">#{item.carNumber} {item.driverName}</div>
                    <div className="text-xs text-track-muted">{item.teamName}</div>
                  </div>
                  <span className="pill">{item.ownership}%</span>
                </div>
              </div>
            )) : <p className="text-track-muted">No team data yet.</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-black">Captain favourites</h2>
          <div className="mt-4 space-y-2">
            {mostCaptained.length ? mostCaptained.map((item, index) => (
              <div key={item.driverId} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">#{index + 1} · Category {item.category}</div>
                    <div className="font-black">#{item.carNumber} {item.driverName}</div>
                    <div className="text-xs text-track-muted">{item.teamName}</div>
                  </div>
                  <span className="pill">{item.captaincy}% C</span>
                </div>
              </div>
            )) : <p className="text-track-muted">Captain stats appear once teams are saved.</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-black">Differential finder</h2>
          <div className="mt-4 space-y-2">
            {differentials.map((item) => (
              <div key={item.driverId} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">Category {item.category}</div>
                    <div className="font-black">#{item.carNumber} {item.driverName}</div>
                    <div className="text-xs text-track-muted">{item.teamName}</div>
                  </div>
                  <span className="pill">{item.ownership}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">Category ownership</h2>
        <p className="mt-1 text-sm text-track-muted">Top picks by category for the open round.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {byCategory.map((group) => (
            <div key={group.category} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-xl font-black">Category {group.category}</div>
              {group.top.length ? group.top.map((item) => (
                <div key={item.driverId} className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3">
                  <span className="font-bold">#{item.carNumber} {item.driverName}</span>
                  <span className="text-sm font-black text-orange-100">{item.ownership}%</span>
                </div>
              )) : <div className="text-sm text-track-muted">No picks yet.</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
