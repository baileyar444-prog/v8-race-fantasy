"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";
import { fallbackDrivers, fallbackEvents, upcomingEventSlugs } from "@/lib/mock-data";
import { calculateRaceFantasyPoints, normaliseDriverEventScore, applyCaptaincy, ClassificationStatus, PenaltyType } from "@/lib/race-scoring";

type RoleState = "loading" | "logged-out" | "not-admin" | "admin";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  full_name: string;
  lockout_at: string | null;
  manual_lock: boolean;
  is_open_event: boolean;
  number_of_races: number;
  event_multiplier: number;
  sort_order: number;
};

type DriverRow = {
  id: string;
  slug: string;
  car_number: string;
  driver_name: string;
  team_name: string;
  category: string;
  points_position: number;
  championship_points: number;
  wins: number;
  last_round_fantasy_points: number;
  is_active: boolean;
};

type ResultDraft = {
  qualifying_position: string;
  finish_position: string;
  classification: ClassificationStatus;
  fastest_lap: boolean;
  penalty: PenaltyType;
  race_fantasy_points: number;
};

type FantasyPick = {
  category: string;
  driver_id: string;
  drivers?: {
    driver_name: string | null;
    team_name: string | null;
    car_number: string | null;
    category: string | null;
  } | null;
};

type FantasyTeam = {
  id: string;
  user_id: string;
  event_id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  fantasy_team_picks?: FantasyPick[];
};

const categories = ["A", "B", "C", "D", "E", "F"];
const classifications: ClassificationStatus[] = ["finished", "dnf", "dns", "dsq"];
const penalties: PenaltyType[] = ["none", "minor", "major"];

function emptyDraft(): ResultDraft {
  return {
    qualifying_position: "",
    finish_position: "",
    classification: "finished",
    fastest_lap: false,
    penalty: "none",
    race_fantasy_points: 0
  };
}

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function RaceControlPage() {
  const supabase = createClient();

  const [roleState, setRoleState] = useState<RoleState>("loading");
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRace, setSelectedRace] = useState(1);
  const [resultDrafts, setResultDrafts] = useState<Record<string, ResultDraft>>({});
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const raceNumbers = Array.from({ length: selectedEvent?.number_of_races ?? 1 }, (_, index) => index + 1);

  async function checkAdmin() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setRoleState("logged-out");
      return;
    }

    setEmail(userData.user.email ?? "");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error || !profile) {
      setRoleState("not-admin");
      return;
    }

    setRoleState(profile.role === "admin" ? "admin" : "not-admin");
  }

  async function loadAdminData() {
    setBusy(true);
    setErrorMessage("");

    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id,slug,name,full_name,lockout_at,manual_lock,is_open_event,number_of_races,event_multiplier,sort_order")
        .in("slug", [...upcomingEventSlugs])
        .order("sort_order");

      if (eventError) throw eventError;

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id,slug,car_number,driver_name,team_name,category,points_position,championship_points,wins,last_round_fantasy_points,is_active")
        .eq("is_active", true)
        .order("points_position");

      if (driverError) throw driverError;

      setEvents((eventData ?? []) as EventRow[]);
      setDrivers((driverData ?? []) as DriverRow[]);

      const open = (eventData ?? []).find((event) => event.is_open_event);
      const first = (eventData ?? [])[0];

      if (!selectedEventId) {
        setSelectedEventId(open?.id ?? first?.id ?? "");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load Race Control data.");
    } finally {
      setBusy(false);
    }
  }

  async function loadRaceResults(eventId: string, raceNumber: number) {
    if (!eventId) return;

    setBusy(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("race_results")
        .select("driver_id,qualifying_position,finish_position,classification,fastest_lap,penalty,race_fantasy_points")
        .eq("event_id", eventId)
        .eq("race_number", raceNumber);

      if (error) throw error;

      const nextDrafts: Record<string, ResultDraft> = {};
      for (const driver of drivers) {
        const existing = (data ?? []).find((row) => row.driver_id === driver.id);
        nextDrafts[driver.id] = existing
          ? {
              qualifying_position: existing.qualifying_position?.toString() ?? "",
              finish_position: existing.finish_position?.toString() ?? "",
              classification: existing.classification as ClassificationStatus,
              fastest_lap: Boolean(existing.fastest_lap),
              penalty: existing.penalty as PenaltyType,
              race_fantasy_points: Number(existing.race_fantasy_points ?? 0)
            }
          : emptyDraft();
      }

      setResultDrafts(nextDrafts);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load race results.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (roleState === "admin") {
      loadAdminData();
    }
  }, [roleState]);

  useEffect(() => {
    if (selectedEventId && drivers.length) {
      loadRaceResults(selectedEventId, selectedRace);
    }
  }, [selectedEventId, selectedRace, drivers.length]);

  const groupedDrivers = useMemo(() => {
    return categories.map((category) => ({
      category,
      drivers: drivers.filter((driver) => driver.category === category)
    }));
  }, [drivers]);

  function updateDraft(driverId: string, patch: Partial<ResultDraft>) {
    setResultDrafts((current) => {
      const previous = current[driverId] ?? emptyDraft();
      const next = { ...previous, ...patch };

      next.race_fantasy_points = calculateRaceFantasyPoints({
        qualifying_position: toNumberOrNull(next.qualifying_position),
        finish_position: toNumberOrNull(next.finish_position),
        classification: next.classification,
        fastest_lap: next.fastest_lap,
        penalty: next.penalty
      });

      return { ...current, [driverId]: next };
    });
  }

  async function saveEventSettings() {
    if (!selectedEvent) return;

    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: selectedEvent.name,
          full_name: selectedEvent.full_name,
          number_of_races: selectedEvent.number_of_races,
          event_multiplier: selectedEvent.event_multiplier,
          lockout_at: selectedEvent.lockout_at || null,
          manual_lock: selectedEvent.manual_lock,
          is_open_event: selectedEvent.is_open_event
        })
        .eq("id", selectedEvent.id);

      if (error) throw error;

      if (selectedEvent.is_open_event) {
        const { error: closeOthersError } = await supabase
          .from("events")
          .update({ is_open_event: false })
          .neq("id", selectedEvent.id);

        if (closeOthersError) throw closeOthersError;
      }

      setMessage("Event settings saved.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save event settings.");
    } finally {
      setBusy(false);
    }
  }

  function updateSelectedEvent(patch: Partial<EventRow>) {
    setEvents((current) => current.map((event) => event.id === selectedEventId ? { ...event, ...patch } : event));
  }

  function updateDriver(driverId: string, patch: Partial<DriverRow>) {
    setDrivers((current) => current.map((driver) => driver.id === driverId ? { ...driver, ...patch } : driver));
  }


  async function applyUpcomingRoundList() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const rows = fallbackEvents.map((event) => ({
        slug: event.slug,
        name: event.name,
        full_name: event.full_name,
        lockout_at: event.lockout_at,
        manual_lock: event.manual_lock,
        is_open_event: event.is_open_event,
        number_of_races: event.number_of_races,
        event_multiplier: event.event_multiplier,
        sort_order: event.sort_order
      }));

      const { error } = await supabase
        .from("events")
        .upsert(rows, { onConflict: "slug" });

      if (error) throw error;

      setMessage("Upcoming round list saved. The app now uses location names only.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not apply upcoming rounds.");
    } finally {
      setBusy(false);
    }
  }

  async function applyLatestDriverStandings() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const rows = fallbackDrivers.map((driver) => ({
        slug: driver.id,
        car_number: driver.car_number.slice(0, 3),
        driver_name: driver.driver_name,
        team_name: driver.team_name,
        category: driver.category,
        points_position: driver.points_position,
        championship_points: driver.championship_points,
        wins: driver.wins,
        is_active: true
      }));

      const { error } = await supabase
        .from("drivers")
        .upsert(rows, { onConflict: "slug" });

      if (error) throw error;

      const inactiveSlugs = ["todd-hazelwood", "aaron-seton", "reuben-goodall", "mark-winterbottom"];
      for (const slug of inactiveSlugs) {
        await supabase.from("drivers").update({ is_active: false }).eq("slug", slug);
      }

      setMessage("Latest 2026 standings applied. Categories A–F have been refreshed.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not apply latest standings.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDriver(driver: DriverRow) {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          car_number: driver.car_number.slice(0, 3),
          driver_name: driver.driver_name,
          team_name: driver.team_name,
          category: driver.category,
          points_position: driver.points_position,
          championship_points: driver.championship_points,
          wins: driver.wins,
          last_round_fantasy_points: driver.last_round_fantasy_points,
          is_active: driver.is_active
        })
        .eq("id", driver.id);

      if (error) throw error;

      setMessage(`${driver.driver_name} saved.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save driver.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRaceResults() {
    if (!selectedEventId) return;

    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const rows = drivers.map((driver) => {
        const draft = resultDrafts[driver.id] ?? emptyDraft();
        const points = calculateRaceFantasyPoints({
          qualifying_position: toNumberOrNull(draft.qualifying_position),
          finish_position: toNumberOrNull(draft.finish_position),
          classification: draft.classification,
          fastest_lap: draft.fastest_lap,
          penalty: draft.penalty
        });

        return {
          event_id: selectedEventId,
          race_number: selectedRace,
          driver_id: driver.id,
          qualifying_position: toNumberOrNull(draft.qualifying_position),
          finish_position: toNumberOrNull(draft.finish_position),
          classification: draft.classification,
          fastest_lap: draft.fastest_lap,
          penalty: draft.penalty,
          race_fantasy_points: points
        };
      });

      const { error } = await supabase
        .from("race_results")
        .upsert(rows, { onConflict: "event_id,race_number,driver_id" });

      if (error) throw error;

      setMessage(`Race ${selectedRace} results saved.`);
      await loadRaceResults(selectedEventId, selectedRace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save race results.");
    } finally {
      setBusy(false);
    }
  }

  async function publishFantasyScores() {
    if (!selectedEvent) return;

    const confirmed = window.confirm(
      `Publish scores for ${selectedEvent.name}?\n\nThis will calculate all saved teams for this event, freeze their scoring snapshot and update the leaderboard. You can republish later if Race Control fixes a result.`
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { data: results, error: resultsError } = await supabase
        .from("race_results")
        .select("driver_id,race_number,race_fantasy_points")
        .eq("event_id", selectedEvent.id);

      if (resultsError) throw resultsError;

      const scoreByDriver: Record<string, number[]> = {};
      for (const result of results ?? []) {
        const driverId = result.driver_id as string;
        if (!scoreByDriver[driverId]) scoreByDriver[driverId] = [];
        scoreByDriver[driverId].push(Number(result.race_fantasy_points ?? 0));
      }

      const normalisedByDriver: Record<string, number> = {};
      for (const [driverId, raceScores] of Object.entries(scoreByDriver)) {
        normalisedByDriver[driverId] = normaliseDriverEventScore(raceScores);
      }

      const { data: teams, error: teamsError } = await supabase
        .from("fantasy_teams")
        .select("id,user_id,event_id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(category,driver_id,drivers(driver_name,team_name,car_number,category))")
        .eq("event_id", selectedEvent.id);

      if (teamsError) throw teamsError;

      if (!teams?.length) {
        setMessage("No fantasy teams found for this event yet. Users without a saved team will show 0 points in My Team.");
        return;
      }

      const multiplier = Number(selectedEvent.event_multiplier ?? 1);
      const publishedAt = new Date().toISOString();
      const scoreRows = [];
      const pickScoreRows = [];

      for (const team of (teams ?? []) as FantasyTeam[]) {
        const picks = [...(team.fantasy_team_picks ?? [])].sort((a, b) => a.category.localeCompare(b.category));

        let regularPoints = 0;
        let captainBoost = 0;
        let viceBoost = 0;
        let rawTeamScore = 0;

        for (const pick of picks) {
          const baseScore = Math.round(Number(normalisedByDriver[pick.driver_id] ?? 0) * 10) / 10;
          const isCaptain = pick.driver_id === team.captain_driver_id;
          const isViceCaptain = pick.driver_id === team.vice_captain_driver_id;
          const captainMultiplier = isCaptain ? 2 : isViceCaptain ? 1.5 : 1;
          const multipliedDriverScore = Math.round(baseScore * captainMultiplier * 10) / 10;
          const finalDriverScore = Math.round(multipliedDriverScore * multiplier * 10) / 10;

          regularPoints += baseScore;
          if (isCaptain) captainBoost += baseScore;
          if (isViceCaptain) viceBoost += baseScore * 0.5;
          rawTeamScore += multipliedDriverScore;

          pickScoreRows.push({
            user_id: team.user_id,
            event_id: selectedEvent.id,
            fantasy_team_id: team.id,
            category: pick.category,
            driver_id: pick.driver_id,
            driver_name: pick.drivers?.driver_name ?? drivers.find((driver) => driver.id === pick.driver_id)?.driver_name ?? "Driver",
            team_name: pick.drivers?.team_name ?? drivers.find((driver) => driver.id === pick.driver_id)?.team_name ?? "Team",
            car_number: (pick.drivers?.car_number ?? drivers.find((driver) => driver.id === pick.driver_id)?.car_number ?? "").slice(0, 3),
            base_driver_score: baseScore,
            captain_multiplier: captainMultiplier,
            multiplied_driver_score: multipliedDriverScore,
            final_driver_score: finalDriverScore,
            is_captain: isCaptain,
            is_vice_captain: isViceCaptain,
            updated_at: publishedAt
          });
        }

        const normalisedEventScore = Math.round(rawTeamScore * 10) / 10;
        const publishedScore = Math.round(normalisedEventScore * multiplier * 10) / 10;

        scoreRows.push({
          user_id: team.user_id,
          event_id: selectedEvent.id,
          fantasy_team_id: team.id,
          normalised_event_score: normalisedEventScore,
          published_score: publishedScore,
          raw_team_score: normalisedEventScore,
          regular_points: Math.round(regularPoints * 10) / 10,
          captain_points: Math.round(captainBoost * 10) / 10,
          vice_captain_points: Math.round(viceBoost * 10) / 10,
          event_multiplier: multiplier,
          picks_count: picks.length,
          status: "published",
          calculated_at: publishedAt
        });
      }

      const { error: scoreError } = await supabase
        .from("fantasy_scores")
        .upsert(scoreRows, { onConflict: "user_id,event_id" });

      if (scoreError) throw scoreError;

      if (pickScoreRows.length) {
        const { error: pickScoreError } = await supabase
          .from("fantasy_pick_scores")
          .upsert(pickScoreRows, { onConflict: "fantasy_team_id,event_id,category" });

        if (pickScoreError) throw pickScoreError;
      }

      const teamUpdates = ((teams ?? []) as FantasyTeam[]).map((team) =>
        supabase
          .from("fantasy_teams")
          .update({ locked_at: publishedAt, score_published_at: publishedAt, status: "scored" })
          .eq("id", team.id)
      );
      await Promise.all(teamUpdates);

      const lastRoundUpdates = drivers.map((driver) => ({
        id: driver.id,
        last_round_fantasy_points: normalisedByDriver[driver.id] ?? 0
      }));

      for (const update of lastRoundUpdates) {
        await supabase.from("drivers").update({ last_round_fantasy_points: update.last_round_fantasy_points }).eq("id", update.id);
      }

      setMessage(`Published ${selectedEvent.name} scores for ${scoreRows.length} team${scoreRows.length === 1 ? "" : "s"}. My Team history and leaderboards are now updated. You can republish if needed.`);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not publish fantasy scores.");
    } finally {
      setBusy(false);
    }
  }

  if (roleState === "loading") {
    return <div className="card">Checking Race Control access...</div>;
  }

  if (roleState === "logged-out") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin only" title="Race Control is locked">
          You need to log in with an admin account to access Race Control.
        </PageHeader>
        <Link className="btn btn-primary" href="/login">Log in</Link>
      </div>
    );
  }

  if (roleState === "not-admin") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Access denied" title="Race Control is admin-only">
          This area is only available to users with the <strong>admin</strong> role. It cannot be unlocked through public signup.
        </PageHeader>

        <div className="card">
          <h2 className="text-2xl font-black">Your account does not have Race Control access</h2>
          <p className="mt-2 text-track-muted">
            Logged in as {email || "this account"}. Normal users can create garages, join leagues and pick teams, but they cannot manage events, drivers, results or sponsors.
          </p>
          <Link className="btn mt-4" href="/">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin only" title="Race Control">
        Use the shortcuts, set the open round, enter race results and publish scores to the leaderboard.
      </PageHeader>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <div className="pill mb-3">Step 1</div>
          <h2 className="text-2xl font-black">Open the round</h2>
          <p className="mt-2 text-sm text-track-muted">Choose the location, set the lockout time and save the open event.</p>
        </div>
        <div className="card">
          <div className="pill mb-3">Step 2</div>
          <h2 className="text-2xl font-black">Enter results</h2>
          <p className="mt-2 text-sm text-track-muted">Pick the race tab, enter qualifying, finish, penalties and fastest lap.</p>
        </div>
        <div className="card">
          <div className="pill mb-3">Step 3</div>
          <h2 className="text-2xl font-black">Publish</h2>
          <p className="mt-2 text-sm text-track-muted">Save each race first, then publish. Publishing freezes a scoring snapshot for every saved team. Republish if Race Control later fixes a result.</p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black">Quick setup</h2>
            <p className="mt-1 text-sm text-track-muted">Use these after uploading the new version, or whenever the database needs a refresh.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn" disabled={busy} onClick={applyUpcomingRoundList}>Apply upcoming rounds</button>
            <button className="btn btn-primary" disabled={busy} onClick={applyLatestDriverStandings}>Apply latest standings</button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-2xl font-black">Event manager</h2>
            <p className="mt-1 text-sm text-track-muted">Choose the location, set lockout, race count and multiplier.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-track-muted">Event
              <select className="select mt-1" value={selectedEventId} onChange={(event) => { setSelectedEventId(event.target.value); setSelectedRace(1); }}>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
            </label>

            <label className="text-sm font-bold text-track-muted">Display name
              <input className="input mt-1" value={selectedEvent?.full_name ?? ""} onChange={(event) => updateSelectedEvent({ full_name: event.target.value })} />
            </label>

            <label className="text-sm font-bold text-track-muted">Number of races
              <select className="select mt-1" value={selectedEvent?.number_of_races ?? 1} onChange={(event) => updateSelectedEvent({ number_of_races: Number(event.target.value) })}>
                <option value={1}>1 race</option>
                <option value={2}>2 races</option>
                <option value={3}>3 races</option>
              </select>
            </label>

            <label className="text-sm font-bold text-track-muted">Event multiplier
              <select className="select mt-1" value={selectedEvent?.event_multiplier ?? 1} onChange={(event) => updateSelectedEvent({ event_multiplier: Number(event.target.value) })}>
                <option value={1}>1x normal event</option>
                <option value={2}>2x double points</option>
              </select>
            </label>

            <label className="text-sm font-bold text-track-muted">Lockout date/time
              <input className="input mt-1" type="datetime-local" value={selectedEvent?.lockout_at ? selectedEvent.lockout_at.slice(0, 16) : ""} onChange={(event) => updateSelectedEvent({ lockout_at: event.target.value })} />
            </label>

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={selectedEvent?.is_open_event ?? false} onChange={(event) => updateSelectedEvent({ is_open_event: event.target.checked })} />
                Open event for team selection
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={selectedEvent?.manual_lock ?? false} onChange={(event) => updateSelectedEvent({ manual_lock: event.target.checked })} />
                Manually lock event
              </label>
            </div>

            <button className="btn btn-primary md:col-span-2" disabled={busy || !selectedEvent} onClick={saveEventSettings}>
              Save event settings
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-black">Race results entry</h2>
            <p className="mt-1 text-sm text-track-muted">
              Enter one race at a time. Fantasy points calculate automatically as you type.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {raceNumbers.map((raceNumber) => (
              <button
                key={raceNumber}
                className={`btn ${selectedRace === raceNumber ? "btn-primary" : ""}`}
                onClick={() => setSelectedRace(raceNumber)}
              >
                Race {raceNumber}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-track-muted">
                <th className="px-3 py-2">Cat</th>
                <th className="px-3 py-2">Car</th>
                <th className="px-3 py-2">Driver</th>
                <th className="px-3 py-2">Qualifying position</th>
                <th className="px-3 py-2">Race finish position</th>
                <th className="px-3 py-2">Classification</th>
                <th className="px-3 py-2">Fastest lap</th>
                <th className="px-3 py-2">Penalty</th>
                <th className="px-3 py-2 text-right">Race fantasy pts</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const draft = resultDrafts[driver.id] ?? emptyDraft();

                return (
                  <tr key={driver.id} className="bg-white/5">
                    <td className="rounded-l-2xl px-3 py-3 font-black">{driver.category}</td>
                    <td className="px-3 py-3">#{driver.car_number}</td>
                    <td className="px-3 py-3">
                      <div className="font-black">{driver.driver_name}</div>
                      <div className="text-xs text-track-muted">{driver.team_name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <input className="input w-24" inputMode="numeric" value={draft.qualifying_position} onChange={(event) => updateDraft(driver.id, { qualifying_position: event.target.value.replace(/\D/g, "").slice(0, 2) })} />
                    </td>
                    <td className="px-3 py-3">
                      <input className="input w-24" inputMode="numeric" value={draft.finish_position} onChange={(event) => updateDraft(driver.id, { finish_position: event.target.value.replace(/\D/g, "").slice(0, 2) })} />
                    </td>
                    <td className="px-3 py-3">
                      <select className="select w-32" value={draft.classification} onChange={(event) => updateDraft(driver.id, { classification: event.target.value as ClassificationStatus })}>
                        {classifications.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={draft.fastest_lap} onChange={(event) => updateDraft(driver.id, { fastest_lap: event.target.checked })} />
                    </td>
                    <td className="px-3 py-3">
                      <select className="select w-28" value={draft.penalty} onChange={(event) => updateDraft(driver.id, { penalty: event.target.value as PenaltyType })}>
                        {penalties.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </td>
                    <td className="rounded-r-2xl px-3 py-3 text-right text-xl font-black">{draft.race_fantasy_points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn btn-primary" disabled={busy || !selectedEvent} onClick={saveRaceResults}>Save Race {selectedRace} results</button>
          <button className="btn" disabled={busy || !selectedEvent} onClick={publishFantasyScores}>Publish / republish event scores</button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">Driver manager</h2>
        <p className="mt-1 text-sm text-track-muted">
          Edit names, teams, numbers, categories and the stats shown across the website.
        </p>

        <div className="mt-5 space-y-6">
          {groupedDrivers.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-xl font-black">Category {group.category}</h3>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-sm text-track-muted">
                      <th className="px-3 py-2">Car #</th>
                      <th className="px-3 py-2">Driver name</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Points pos</th>
                      <th className="px-3 py-2">Champ pts</th>
                      <th className="px-3 py-2">Wins</th>
                      <th className="px-3 py-2">Last fantasy pts</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.drivers.map((driver) => (
                      <tr key={driver.id} className="bg-white/5">
                        <td className="rounded-l-2xl px-3 py-3">
                          <input className="input w-20" maxLength={3} value={driver.car_number} onChange={(event) => updateDriver(driver.id, { car_number: event.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} />
                        </td>
                        <td className="px-3 py-3">
                          <input className="input min-w-44" value={driver.driver_name} onChange={(event) => updateDriver(driver.id, { driver_name: event.target.value })} />
                        </td>
                        <td className="px-3 py-3">
                          <input className="input min-w-56" value={driver.team_name} onChange={(event) => updateDriver(driver.id, { team_name: event.target.value })} />
                        </td>
                        <td className="px-3 py-3">
                          <select className="select w-20" value={driver.category} onChange={(event) => updateDriver(driver.id, { category: event.target.value })}>
                            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-20" type="number" value={driver.points_position} onChange={(event) => updateDriver(driver.id, { points_position: Number(event.target.value) })} />
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-28" type="number" value={driver.championship_points} onChange={(event) => updateDriver(driver.id, { championship_points: Number(event.target.value) })} />
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-20" type="number" value={driver.wins} onChange={(event) => updateDriver(driver.id, { wins: Number(event.target.value) })} />
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-28" type="number" value={driver.last_round_fantasy_points} onChange={(event) => updateDriver(driver.id, { last_round_fantasy_points: Number(event.target.value) })} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input type="checkbox" checked={driver.is_active} onChange={(event) => updateDriver(driver.id, { is_active: event.target.checked })} />
                        </td>
                        <td className="rounded-r-2xl px-3 py-3">
                          <button className="btn" disabled={busy} onClick={() => saveDriver(driver)}>Save</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
