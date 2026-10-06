"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";
import { categories, fallbackDrivers, fallbackEvents, upcomingEventSlugs } from "@/lib/mock-data";
import { friendlyDataError } from "@/lib/friendly-error";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  number_of_races: number;
  is_open_event?: boolean | null;
};

type DriverRow = {
  id: string;
  slug?: string | null;
  car_number: string;
  driver_name: string;
  team_name: string;
  category: string;
  points_position: number;
  championship_points: number;
  wins?: number | null;
  poles?: number | null;
  is_active?: boolean | null;
  last_round_fantasy_points?: number | null;
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

type FantasyTeam = {
  id: string;
  event_id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  status?: string | null;
};

type FantasyPick = {
  fantasy_team_id: string;
  category: string;
  driver_id: string;
};

type EventDriverStats = {
  category: string;
  pickedPercent: number;
  captainPercent: number;
  vicePercent: number;
  pickedCount: number;
  teamCount: number;
};

type DriverSummary = {
  driver: DriverRow;
  totalFantasyPoints: number;
  chosenPercent: number;
  eventStats: Map<string, EventDriverStats>;
  openPickedPercent: number;
  openCaptainPercent: number;
  openVicePercent: number;
  hasSeasonActivity: boolean;
};

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1);
}

function numericPoints(value: number | null | undefined) {
  return Math.round(Number(value ?? 0) * 10) / 10;
}

function percent(value: number) {
  return `${Number(value ?? 0).toFixed(1)}%`;
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
    1: 60,
    2: 54,
    3: 49,
    4: 45,
    5: 41,
    6: 38,
    7: 35,
    8: 32,
    9: 29,
    10: 26,
    11: 24,
    12: 22,
    13: 20,
    14: 18,
    15: 16,
    16: 14,
    17: 12,
    18: 10,
    19: 8,
    20: 6,
    21: 5,
    22: 4,
    23: 3,
    24: 2,
    25: 1,
    26: 1,
    27: 1
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
  if (result.classification === "dns" || result.classification === "dsq") {
    return classificationAdjustment(result.classification);
  }

  return finishPoints(result.finish_position) + classificationAdjustment(result.classification);
}

function positionLabel(position?: number | null, classification?: string | null) {
  if (classification === "dns") return "DNS";
  if (classification === "dsq") return "DSQ";
  if (classification === "dnf" && !position) return "DNF";
  if (!position) return "—";
  return `P${position}${classification === "dnf" ? " DNF" : ""}`;
}

function categoryLabel(driver: DriverRow) {
  if (Number(driver.championship_points ?? 0) <= 0) return "Wildcard";
  return `P${driver.points_position} · ${driver.championship_points} pts`;
}

function driverStatus(driver: DriverRow, hasSeasonActivity: boolean) {
  if (driver.is_active !== false) return "Active";
  if (hasSeasonActivity) return "Season";
  return "Historical";
}

export default function DriversPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<EventRow[]>(fallbackEvents as EventRow[]);
  const [drivers, setDrivers] = useState<DriverRow[]>(fallbackDrivers as DriverRow[]);
  const [results, setResults] = useState<RaceResultRow[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [picks, setPicks] = useState<FantasyPick[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortKey, setSortKey] = useState<"champ" | "total" | "last" | "next" | "captain" | "vice">("champ");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id,slug,name,sort_order,number_of_races,is_open_event")
          .in("slug", [...upcomingEventSlugs])
          .order("sort_order");

        if (eventError) throw eventError;

        const nextEvents = ((eventData?.length ? eventData : fallbackEvents) ?? []) as EventRow[];
        setEvents(nextEvents);

        const eventIds = nextEvents.map((event) => event.id);

        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("id,slug,car_number,driver_name,team_name,category,points_position,championship_points,wins,poles,is_active,last_round_fantasy_points")
          .order("points_position");

        if (driverError) throw driverError;
        setDrivers((driverData?.length ? driverData : fallbackDrivers) as DriverRow[]);

        if (eventIds.length) {
          const { data: resultData, error: resultError } = await supabase
            .from("race_results")
            .select("event_id,race_number,driver_id,qualifying_position,finish_position,classification,race_fantasy_points")
            .in("event_id", eventIds);

          if (resultError) throw resultError;
          setResults((resultData ?? []) as RaceResultRow[]);

          const { data: teamData, error: teamError } = await supabase
            .from("fantasy_teams")
            .select("id,event_id,captain_driver_id,vice_captain_driver_id,status")
            .in("event_id", eventIds);

          if (teamError) throw teamError;

          const nextTeams = (teamData ?? []) as FantasyTeam[];
          setTeams(nextTeams);

          const teamIds = nextTeams.map((team) => team.id);
          if (teamIds.length) {
            const { data: pickData, error: pickError } = await supabase
              .from("fantasy_team_picks")
              .select("fantasy_team_id,category,driver_id")
              .in("fantasy_team_id", teamIds);

            if (pickError) throw pickError;
            setPicks((pickData ?? []) as FantasyPick[]);
          } else {
            setPicks([]);
          }
        } else {
          setResults([]);
          setTeams([]);
          setPicks([]);
        }
      } catch (error) {
        setErrorMessage(friendlyDataError(error, "Could not load driver statistics."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }, [events]);

  const openEvent = sortedEvents.find((event) => event.is_open_event) ?? sortedEvents[0];

  const teamsByEvent = useMemo(() => {
    const map = new Map<string, FantasyTeam[]>();
    for (const team of teams) {
      const list = map.get(team.event_id) ?? [];
      list.push(team);
      map.set(team.event_id, list);
    }

    return map;
  }, [teams]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const picksByEventDriver = useMemo(() => {
    const map = new Map<string, FantasyPick[]>();

    for (const pick of picks) {
      const team = teamById.get(pick.fantasy_team_id);
      if (!team) continue;

      const key = `${team.event_id}:${pick.driver_id}`;
      const list = map.get(key) ?? [];
      list.push(pick);
      map.set(key, list);
    }

    return map;
  }, [picks, teamById]);

  const resultsByDriverEvent = useMemo(() => {
    const map = new Map<string, RaceResultRow[]>();

    for (const result of results) {
      const key = `${result.driver_id}:${result.event_id}`;
      const list = map.get(key) ?? [];
      list.push(result);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => Number(a.race_number) - Number(b.race_number));
    }

    return map;
  }, [results]);

  const involvedDriverIds = useMemo(() => {
    const ids = new Set<string>();

    for (const result of results) {
      ids.add(result.driver_id);
    }

    for (const pick of picks) {
      ids.add(pick.driver_id);
    }

    for (const team of teams) {
      if (team.captain_driver_id) ids.add(team.captain_driver_id);
      if (team.vice_captain_driver_id) ids.add(team.vice_captain_driver_id);
    }

    return ids;
  }, [results, picks, teams]);

  const driverSummaries = useMemo<DriverSummary[]>(() => {
    return drivers
      .map((driver) => {
        const driverResults = results.filter((result) => result.driver_id === driver.id);
        const hasSeasonActivity = driver.is_active !== false || involvedDriverIds.has(driver.id);

        const eventStats = new Map<string, EventDriverStats>();

        for (const event of sortedEvents) {
          const eventTeams = teamsByEvent.get(event.id) ?? [];
          const eventPicks = picksByEventDriver.get(`${event.id}:${driver.id}`) ?? [];
          const totalTeams = eventTeams.length;
          const pickedCount = eventPicks.length;
          const captainCount = eventTeams.filter((team) => team.captain_driver_id === driver.id).length;
          const viceCount = eventTeams.filter((team) => team.vice_captain_driver_id === driver.id).length;

          const categoryCounts = new Map<string, number>();
          for (const pick of eventPicks) {
            categoryCounts.set(pick.category, (categoryCounts.get(pick.category) ?? 0) + 1);
          }

          const category = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? driver.category;

          eventStats.set(event.id, {
            category,
            pickedPercent: totalTeams ? (pickedCount / totalTeams) * 100 : 0,
            captainPercent: totalTeams ? (captainCount / totalTeams) * 100 : 0,
            vicePercent: totalTeams ? (viceCount / totalTeams) * 100 : 0,
            pickedCount,
            teamCount: totalTeams
          });
        }

        const scoredEventTotals = sortedEvents.map((event) => {
          const raceScores = (resultsByDriverEvent.get(`${driver.id}:${event.id}`) ?? [])
            .reduce((sum, result) => sum + Number(result.race_fantasy_points ?? 0), 0);
          const divisor = Math.max(1, Number(event.number_of_races ?? 1));
          return raceScores / divisor;
        });
        const totalFantasyPoints = scoredEventTotals.reduce((sum, value) => sum + value, 0);
        const chosenEvents = [...eventStats.values()].filter((stats) => stats.teamCount > 0);
        const chosenPercent = chosenEvents.length
          ? chosenEvents.reduce((sum, stats) => sum + stats.pickedPercent, 0) / chosenEvents.length
          : 0;
        const openStats = openEvent ? eventStats.get(openEvent.id) : null;

        return {
          driver,
          totalFantasyPoints,
          chosenPercent,
          eventStats,
          openPickedPercent: openStats?.pickedPercent ?? 0,
          openCaptainPercent: openStats?.captainPercent ?? 0,
          openVicePercent: openStats?.vicePercent ?? 0,
          hasSeasonActivity
        };
      })
      .filter((summary) => summary.hasSeasonActivity);
  }, [drivers, sortedEvents, teamsByEvent, picksByEventDriver, openEvent, involvedDriverIds, resultsByDriverEvent]);

  const openRoundTeamCount = openEvent ? (teamsByEvent.get(openEvent.id) ?? []).length : 0;
  const openActiveSummaries = driverSummaries.filter((summary) => summary.driver.is_active !== false);
  const openMostPicked = [...openActiveSummaries].sort((a, b) => b.openPickedPercent - a.openPickedPercent || b.openCaptainPercent - a.openCaptainPercent)[0] ?? null;
  const openLeastPicked = [...openActiveSummaries].sort((a, b) => a.openPickedPercent - b.openPickedPercent || Number(a.driver.points_position ?? 999) - Number(b.driver.points_position ?? 999))[0] ?? null;
  const openCaptainFavourite = [...openActiveSummaries].sort((a, b) => b.openCaptainPercent - a.openCaptainPercent || b.openPickedPercent - a.openPickedPercent)[0] ?? null;
  const openViceFavourite = [...openActiveSummaries].sort((a, b) => b.openVicePercent - a.openVicePercent || b.openPickedPercent - a.openPickedPercent)[0] ?? null;

  const filteredDrivers = driverSummaries
    .filter(({ driver }) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query
        || driver.driver_name.toLowerCase().includes(query)
        || driver.team_name.toLowerCase().includes(query)
        || driver.car_number.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === "All" || driver.category === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "champ") {
        if (categoryFilter === "All" && a.driver.category !== b.driver.category) {
          return a.driver.category.localeCompare(b.driver.category);
        }
        return (Number(a.driver.points_position ?? 999) - Number(b.driver.points_position ?? 999)) * direction;
      }

      const valueFor = (summary: DriverSummary) => {
        if (sortKey === "total") return summary.totalFantasyPoints;
        if (sortKey === "last") return Number(summary.driver.last_round_fantasy_points ?? 0);
        if (sortKey === "next") return summary.openPickedPercent;
        if (sortKey === "captain") return summary.openCaptainPercent;
        if (sortKey === "vice") return summary.openVicePercent;
        return Number(summary.driver.points_position ?? 999);
      };

      const delta = valueFor(a) - valueFor(b);
      if (delta !== 0) return delta * direction;
      return Number(a.driver.points_position ?? 999) - Number(b.driver.points_position ?? 999);
    });

  function sortButton(label: string, key: typeof sortKey) {
    const active = sortKey === key;
    const arrow = active ? (sortDirection === "asc" ? "↑" : "↓") : "↕";

    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1 font-black ${active ? "text-orange-100" : "text-track-muted hover:text-white"}`}
        onClick={() => {
          if (active) {
            setSortDirection((current) => current === "asc" ? "desc" : "asc");
          } else {
            setSortKey(key);
            setSortDirection(key === "champ" ? "asc" : "desc");
          }
        }}
      >
        {label} <span>{arrow}</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Drivers" title="Driver stats">
        Live Bathurst ownership plus season fantasy stats. Sort the table, then tap a driver name for race-by-race details.
      </PageHeader>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <section className="card border-track-orange/25 bg-track-orange/10 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="pill mb-2">Open round</div>
            <h2 className="text-xl font-black sm:text-2xl">{openEvent?.name ?? "Next round"}</h2>
            <p className="mt-1 text-sm text-track-muted">
              Live {openEvent?.name ?? "open round"} picked %, captain % and vice % from {openRoundTeamCount} saved team{openRoundTeamCount === 1 ? "" : "s"}. Fantasy points are divided by the scheduled races for each event.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link className="btn btn-primary px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/pick-team">Pick team</Link>
            <Link className="btn px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/round-preview">Preview</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-track-orange/25 bg-track-orange/10 p-3">
          <div className="text-xs font-black uppercase tracking-[.14em] text-track-muted">Most picked</div>
          <div className="mt-1 font-black">{openMostPicked ? `#${openMostPicked.driver.car_number} ${openMostPicked.driver.driver_name}` : "No picks yet"}</div>
          <div className="mt-1 text-sm font-black text-orange-100">{openMostPicked ? percent(openMostPicked.openPickedPercent) : "0.0%"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-black uppercase tracking-[.14em] text-track-muted">Least picked</div>
          <div className="mt-1 font-black">{openLeastPicked ? `#${openLeastPicked.driver.car_number} ${openLeastPicked.driver.driver_name}` : "No data yet"}</div>
          <div className="mt-1 text-sm font-black text-orange-100">{openLeastPicked ? percent(openLeastPicked.openPickedPercent) : "0.0%"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-black uppercase tracking-[.14em] text-track-muted">Captain favourite</div>
          <div className="mt-1 font-black">{openCaptainFavourite ? `#${openCaptainFavourite.driver.car_number} ${openCaptainFavourite.driver.driver_name}` : "No captains yet"}</div>
          <div className="mt-1 text-sm font-black text-orange-100">{openCaptainFavourite ? `${percent(openCaptainFavourite.openCaptainPercent)} C` : "0.0%"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-black uppercase tracking-[.14em] text-track-muted">Vice favourite</div>
          <div className="mt-1 font-black">{openViceFavourite ? `#${openViceFavourite.driver.car_number} ${openViceFavourite.driver.driver_name}` : "No vice picks yet"}</div>
          <div className="mt-1 text-sm font-black text-orange-100">{openViceFavourite ? `${percent(openViceFavourite.openVicePercent)} VC` : "0.0%"}</div>
        </div>
      </section>

      <section className="card p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="text-sm font-bold text-track-muted">
            Search
            <input
              className="input mt-1"
              value={search}
              placeholder="Payne, Feeney, Tickford..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="text-sm font-bold text-track-muted">
            Category
            <select className="select mt-1" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>Category {category}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? <div className="card">Loading driver stats...</div> : null}

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[.14em] text-track-muted">
              <tr>
                <th className="px-3 py-3">Driver</th>
                <th className="px-3 py-3">Cat</th>
                <th className="px-3 py-3">{sortButton("Champ", "champ")}</th>
                <th className="px-3 py-3">{sortButton("Total FP", "total")}</th>
                <th className="px-3 py-3">{sortButton("Last", "last")}</th>
                <th className="px-3 py-3">Chosen %</th>
                <th className="px-3 py-3">{sortButton((openEvent?.name ?? "Next") + " picked", "next")}</th>
                <th className="px-3 py-3">{sortButton("C", "captain")}</th>
                <th className="px-3 py-3">{sortButton("VC", "vice")}</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((summary) => {
                const { driver, eventStats, totalFantasyPoints, chosenPercent, openPickedPercent, openCaptainPercent, openVicePercent, hasSeasonActivity } = summary;
                const expanded = selectedDriverId === driver.id;
                const driverEventResults = sortedEvents.map((event) => ({
                  event,
                  stats: eventStats.get(event.id),
                  races: resultsByDriverEvent.get(`${driver.id}:${event.id}`) ?? []
                }));

                return (
                  <Fragment key={driver.id}>
                    <tr className={`border-t border-white/10 ${expanded ? "bg-track-orange/10" : "hover:bg-white/5"}`}>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedDriverId(expanded ? "" : driver.id)}
                          className="text-left font-black text-white underline decoration-track-orange/60 underline-offset-4 hover:text-orange-100"
                        >
                          #{driver.car_number} {driver.driver_name}
                        </button>
                        <div className="mt-0.5 text-xs text-track-muted">{driver.team_name}</div>
                      </td>
                      <td className="px-3 py-3 font-black">Category {driver.category}</td>
                      <td className="px-3 py-3 text-track-muted">{categoryLabel(driver)}</td>
                      <td className="px-3 py-3 font-black text-orange-100">{formatPoints(totalFantasyPoints)}</td>
                      <td className="px-3 py-3">{formatPoints(driver.last_round_fantasy_points)}</td>
                      <td className="px-3 py-3">{percent(chosenPercent)}</td>
                      <td className="px-3 py-3 font-black">{percent(openPickedPercent)}</td>
                      <td className="px-3 py-3">{percent(openCaptainPercent)}</td>
                      <td className="px-3 py-3">{percent(openVicePercent)}</td>
                      <td className="px-3 py-3">
                        <span className={`pill ${driver.is_active === false ? "" : "bg-green-500/15 text-green-100"}`}>
                          {driverStatus(driver, hasSeasonActivity)}
                        </span>
                      </td>
                    </tr>

                    {expanded ? (
                      <tr className="border-t border-track-orange/20 bg-black/20">
                        <td colSpan={10} className="p-3">
                          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                              <div className="text-lg font-black">#{driver.car_number} {driver.driver_name}</div>
                              <div className="text-xs text-track-muted">{driver.team_name} · {categoryLabel(driver)}</div>
                            </div>
                            <button
                              type="button"
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black hover:bg-white/10"
                              onClick={() => setSelectedDriverId("")}
                            >
                              Close
                            </button>
                          </div>

                          <div className="overflow-x-auto rounded-2xl border border-white/10">
                            <table className="w-full min-w-[900px] text-left text-xs">
                              <thead className="bg-white/5 text-track-muted">
                                <tr>
                                  <th className="p-2">Event</th>
                                  <th className="p-2">Cat</th>
                                  <th className="p-2">Picked</th>
                                  <th className="p-2">C</th>
                                  <th className="p-2">VC</th>
                                  <th className="p-2">Race 1</th>
                                  <th className="p-2">Race 2</th>
                                  <th className="p-2">Race 3</th>
                                  <th className="p-2">Event FP</th>
                                </tr>
                              </thead>
                              <tbody>
                                {driverEventResults.map(({ event, stats, races }) => {
                                  const eventTotal = races.reduce((sum, item) => sum + Number(item.race_fantasy_points ?? 0), 0) / Math.max(1, Number(event.number_of_races ?? 1));

                                  return (
                                    <tr key={event.id} className="border-t border-white/10">
                                      <td className="p-2 font-black">
                                        {event.name}
                                        {event.is_open_event ? <span className="ml-2 rounded-full bg-track-orange/20 px-2 py-0.5 text-[10px] text-orange-100">Open</span> : null}
                                      </td>
                                      <td className="p-2">Cat {stats?.category ?? driver.category}</td>
                                      <td className="p-2 font-black">{percent(stats?.pickedPercent ?? 0)}</td>
                                      <td className="p-2">{percent(stats?.captainPercent ?? 0)}</td>
                                      <td className="p-2">{percent(stats?.vicePercent ?? 0)}</td>
                                      {Array.from({ length: 3 }, (_, index) => index + 1).map((raceNumber) => {
                                        const result = races.find((item) => Number(item.race_number) === raceNumber);
                                        const qPoints = qualifyingPoints(result?.qualifying_position);
                                        const rPoints = racePointsOnly(result);
                                        const total = result ? formatPoints(result.race_fantasy_points ?? qPoints + rPoints) : "—";

                                        return (
                                          <td key={raceNumber} className="p-2">
                                            {result ? (
                                              <div className="leading-5">
                                                <div className="font-black text-orange-100">{total} raw</div>
                                                <div className="text-track-muted">Q {positionLabel(result.qualifying_position)} · {qPoints}</div>
                                                <div className="text-track-muted">R {positionLabel(result.finish_position, result.classification)} · {rPoints}</div>
                                              </div>
                                            ) : (
                                              <span className="text-track-muted">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="p-2 font-black text-orange-100">{races.length ? formatPoints(eventTotal) : "—"}</td>
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

        {!loading && !filteredDrivers.length ? (
          <div className="p-4 text-track-muted">No drivers match that search.</div>
        ) : null}
      </section>
    </div>
  );
}
