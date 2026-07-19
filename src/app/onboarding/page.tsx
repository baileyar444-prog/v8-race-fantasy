"use client";

import { useEffect, useMemo, useState } from "react";
import { LockoutCountdown, isLocked } from "@/components/LockoutCountdown";
import { PageHeader } from "@/components/PageHeader";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { categories, fallbackDrivers, fallbackEvents, upcomingEventSlugs } from "@/lib/mock-data";
import { badgeColours } from "@/lib/colours";

type Driver = {
  id: string;
  car_number: string;
  driver_name: string;
  team_name: string;
  category: string;
  points_position: number;
  championship_points: number;
  wins: number;
};

type EventRow = {
  id: string;
  slug?: string;
  name: string;
  full_name: string;
  lockout_at: string | null;
  manual_lock: boolean | null;
  number_of_races: number;
  event_multiplier: number;
  is_open_event: boolean;
};

type EventTeam = {
  id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  fantasy_team_picks?: {
    driver_id: string;
  }[];
};

type DriverOwnership = {
  picks: number;
  captains: number;
  viceCaptains: number;
  ownership: number;
  captaincy: number;
  viceCaptaincy: number;
};

const patternOptions = [
  { value: "chevron", label: "Classic chevron" },
  { value: "chevron-wide", label: "Wide chevron" },
  { value: "chevron-double", label: "Double chevron" },
  { value: "chevron-triple", label: "Triple chevron" },
  { value: "chevron-left", label: "Left chevron" },
  { value: "chevron-right", label: "Right chevron" },
  { value: "chevron-centre", label: "Centre chevrons" },
  { value: "stripe", label: "Stripe" },
  { value: "half", label: "Half" },
  { value: "v", label: "V pattern" }
];

export default function OnboardingPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [garageName, setGarageName] = useState("");
  const [garageColour, setGarageColour] = useState("#ff7a1a");
  const [patternColour, setPatternColour] = useState("#111827");
  const [pattern, setPattern] = useState("chevron");
  const [number, setNumber] = useState(88);

  const [events, setEvents] = useState<EventRow[]>(fallbackEvents as EventRow[]);
  const [drivers, setDrivers] = useState<Driver[]>(fallbackDrivers as Driver[]);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [activeCategory, setActiveCategory] = useState("A");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [captain, setCaptain] = useState("");
  const [vice, setVice] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [savingBadge, setSavingBadge] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState("");

  const openEvent = events.find((event) => event.is_open_event) ?? events[0];
  const eventLocked = isLocked(openEvent?.lockout_at, openEvent?.manual_lock, now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        window.location.href = "/login";
        return;
      }

      setUserId(authData.user.id);
      setEmail(authData.user.email ?? "");
      setDisplayName(authData.user.user_metadata?.full_name ?? "");
      setGarageName(authData.user.user_metadata?.garage_name ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile) {
        const savedColour = profile.banner_colour ?? profile.shield_base_colour ?? "#ff7a1a";
        setDisplayName(profile.display_name ?? "");
        setGarageName(profile.garage_name ?? "");
        setGarageColour(savedColour);
        setPatternColour(profile.shield_pattern_colour ?? "#111827");
        setPattern(profile.shield_pattern ?? "chevron");
        setNumber(profile.shield_number ?? 88);
      }

      const { data: dbEvents } = await supabase
        .from("events")
        .select("id,slug,name,full_name,lockout_at,manual_lock,number_of_races,event_multiplier,is_open_event,sort_order")
        .in("slug", [...upcomingEventSlugs])
        .order("sort_order");

      if (dbEvents?.length) {
        setEvents(dbEvents as EventRow[]);
      }

      const { data: dbDrivers } = await supabase
        .from("drivers")
        .select("id,car_number,driver_name,team_name,category,points_position,championship_points,wins")
        .eq("is_active", true)
        .order("points_position");

      if (dbDrivers?.length) {
        setDrivers(dbDrivers as Driver[]);
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  useEffect(() => {
    async function loadTeam() {
      if (!userId || !openEvent?.id) return;

      const { data: team } = await supabase
        .from("fantasy_teams")
        .select("id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(category,driver_id)")
        .eq("user_id", userId)
        .eq("event_id", openEvent.id)
        .maybeSingle();

      if (!team) return;

      setCaptain(team.captain_driver_id ?? "");
      setVice(team.vice_captain_driver_id ?? "");

      const restored: Record<string, string> = {};
      const teamPicks = Array.isArray(team.fantasy_team_picks) ? team.fantasy_team_picks : [];
      for (const pick of teamPicks as { category: string; driver_id: string }[]) {
        restored[pick.category] = pick.driver_id;
      }
      setPicks(restored);
    }

    loadTeam();
  }, [supabase, userId, openEvent?.id]);

  useEffect(() => {
    async function loadEventOwnership() {
      if (!openEvent?.id) {
        setEventTeams([]);
        return;
      }

      const { data } = await supabase
        .from("fantasy_teams")
        .select("id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(driver_id)")
        .eq("event_id", openEvent.id);

      setEventTeams((data ?? []) as EventTeam[]);
    }

    loadEventOwnership();
  }, [supabase, openEvent?.id]);

  const selectedIds = Object.values(picks).filter(Boolean);

  useEffect(() => {
    if (captain && !selectedIds.includes(captain)) setCaptain("");
    if (vice && !selectedIds.includes(vice)) setVice("");
    if (captain && vice && captain === vice) setVice("");
  }, [captain, vice, selectedIds.join("|")]);

  const profileComplete = Boolean(displayName.trim() && garageName.trim());
  const teamComplete = selectedIds.length === 6 && Boolean(captain) && Boolean(vice) && captain !== vice && !eventLocked;

  const categoryDrivers = useMemo(
    () => drivers.filter((driver) => driver.category === activeCategory),
    [drivers, activeCategory]
  );

  const selectedDriverOptions = selectedIds
    .map((id) => drivers.find((item) => item.id === id))
    .filter(Boolean) as Driver[];

  const checklist = [
    ...categories.map((category) => ({
      label: `Category ${category}`,
      complete: Boolean(picks[category])
    })),
    { label: "Captain selected", complete: Boolean(captain) },
    { label: "Vice-captain selected", complete: Boolean(vice) },
    { label: "Captain and vice different", complete: Boolean(captain && vice && captain !== vice) }
  ];

  const completedChecklistItems = checklist.filter((item) => item.complete).length;

  const ownershipByDriver = useMemo(() => {
    const result: Record<string, DriverOwnership> = {};
    const totalTeams = eventTeams.length;

    for (const team of eventTeams) {
      for (const pick of team.fantasy_team_picks ?? []) {
        if (!pick.driver_id) continue;

        const current = result[pick.driver_id] ?? {
          picks: 0,
          captains: 0,
          viceCaptains: 0,
          ownership: 0,
          captaincy: 0,
          viceCaptaincy: 0
        };

        current.picks += 1;
        if (pick.driver_id === team.captain_driver_id) current.captains += 1;
        if (pick.driver_id === team.vice_captain_driver_id) current.viceCaptains += 1;

        result[pick.driver_id] = current;
      }
    }

    for (const driverId of Object.keys(result)) {
      result[driverId].ownership = totalTeams ? Math.round((result[driverId].picks / totalTeams) * 100) : 0;
      result[driverId].captaincy = totalTeams ? Math.round((result[driverId].captains / totalTeams) * 100) : 0;
      result[driverId].viceCaptaincy = totalTeams ? Math.round((result[driverId].viceCaptains / totalTeams) * 100) : 0;
    }

    return result;
  }, [eventTeams]);

  const mostPickedDriver = useMemo(() => {
    return drivers
      .map((driver) => ({ driver, stats: ownershipByDriver[driver.id] }))
      .filter((item) => item.stats)
      .sort((a, b) => (b.stats?.picks ?? 0) - (a.stats?.picks ?? 0))[0] ?? null;
  }, [drivers, ownershipByDriver]);

  const mostCaptainedDriver = useMemo(() => {
    return drivers
      .map((driver) => ({ driver, stats: ownershipByDriver[driver.id] }))
      .filter((item) => item.stats)
      .sort((a, b) => (b.stats?.captains ?? 0) - (a.stats?.captains ?? 0))[0] ?? null;
  }, [drivers, ownershipByDriver]);

  const teamOwnershipSummary = useMemo(() => {
    const selectedStats = selectedIds.map((id) => ownershipByDriver[id] ?? {
      picks: 0,
      captains: 0,
      viceCaptains: 0,
      ownership: 0,
      captaincy: 0,
      viceCaptaincy: 0
    });

    const averageOwnership = selectedStats.length
      ? Math.round(selectedStats.reduce((sum, item) => sum + item.ownership, 0) / selectedStats.length)
      : 0;

    const differentials = selectedStats.filter((item) => item.ownership > 0 && item.ownership <= 15).length;
    const uniquePicks = selectedStats.filter((item) => item.picks === 1).length;
    const popularPicks = selectedStats.filter((item) => item.ownership >= 40).length;

    let riskLevel = "Balanced";
    if (selectedStats.length && differentials + uniquePicks >= 3) riskLevel = "Aggressive";
    if (selectedStats.length && popularPicks >= 4) riskLevel = "Safe";

    return { averageOwnership, differentials, uniquePicks, popularPicks, riskLevel };
  }, [selectedIds, ownershipByDriver]);

  function driverOwnershipLabel(stats: DriverOwnership | undefined) {
    if (!stats || eventTeams.length === 0) return "New pick";
    if (stats.picks === 1) return "Unique pick";
    if (stats.ownership <= 15) return "Differential";
    if (stats.ownership >= 50) return "Popular pick";
    if (stats.captains >= Math.max(2, Math.ceil(eventTeams.length * 0.25))) return "Captain favourite";
    return "Balanced pick";
  }

  function ownershipBadgeClass(stats: DriverOwnership | undefined) {
    const label = driverOwnershipLabel(stats);
    if (label === "Differential" || label === "Unique pick") return "bg-track-orange/20 text-orange-100";
    if (label === "Popular pick" || label === "Captain favourite") return "bg-green-500/15 text-green-100";
    return "";
  }

  function selectCaptain(driverId: string) {
    setCaptain(driverId);
    if (driverId && driverId === vice) setVice("");
  }

  function selectVice(driverId: string) {
    if (driverId && driverId === captain) {
      setErrorMessage("Captain and vice-captain must be different drivers.");
      return;
    }
    setVice(driverId);
  }

  async function saveProfileRow() {
    if (!userId) throw new Error("You are not logged in.");
    if (!profileComplete) throw new Error("Enter your full name and Garage / Team Name.");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      display_name: displayName.trim(),
      garage_name: garageName.trim(),
      banner_colour: garageColour,
      shield_base_colour: garageColour,
      shield_pattern_colour: patternColour,
      shield_pattern: pattern,
      shield_number: number
    });

    if (profileError) throw profileError;
  }

  async function saveBadge() {
    setSavingBadge(true);
    setErrorMessage("");
    setSuccess("");

    try {
      await saveProfileRow();
      setSuccess("Garage and badge saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong saving your badge.");
    } finally {
      setSavingBadge(false);
    }
  }

  async function saveTeam() {
    setSavingTeam(true);
    setErrorMessage("");
    setSuccess("");

    try {
      if (!userId) throw new Error("You are not logged in.");
      if (!openEvent?.id) throw new Error("There is no open event selected in Race Control.");
      if (eventLocked) throw new Error("This round is locked. Race Control must unlock it before teams can be changed.");
      if (captain && vice && captain === vice) throw new Error("Captain and vice-captain must be different drivers.");
      if (!teamComplete) throw new Error("Pick six drivers, then choose a different captain and vice-captain.");

      if (profileComplete) {
        await saveProfileRow();
      } else {
        await supabase.from("profiles").upsert({
          id: userId,
          email,
          display_name: displayName.trim() || "Manager",
          garage_name: garageName.trim() || "Your Garage",
          banner_colour: garageColour,
          shield_base_colour: garageColour,
          shield_pattern_colour: patternColour,
          shield_pattern: pattern,
          shield_number: number
        });
      }

      const { data: team, error: teamError } = await supabase
        .from("fantasy_teams")
        .upsert(
          {
            user_id: userId,
            event_id: openEvent.id,
            captain_driver_id: captain,
            vice_captain_driver_id: vice
          },
          { onConflict: "user_id,event_id" }
        )
        .select("id")
        .single();

      if (teamError) throw teamError;
      if (!team?.id) throw new Error("Could not create your fantasy team row.");

      const pickRows = categories.map((category) => ({
        fantasy_team_id: team.id,
        category,
        driver_id: picks[category]
      }));

      const { error: picksError } = await supabase
        .from("fantasy_team_picks")
        .upsert(pickRows, { onConflict: "fantasy_team_id,category" });

      if (picksError) throw picksError;

      setSuccess(`Team saved for ${openEvent.name}. You can finish your Garage / Team Name and badge in step 2.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong saving your team.");
    } finally {
      setSavingTeam(false);
    }
  }

  if (loading) {
    return <div className="card">Loading your garage...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pick Team" title="Step 1: choose your drivers">
        Pick your six drivers first, then finish your Garage / Team Name and badge in step 2.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <section className="card">
          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
            <div>
              <h2 className="text-2xl font-black">1. Save your team</h2>
              <p className="mt-1 text-sm text-track-muted">Open event: {openEvent?.name ?? openEvent?.full_name ?? "No event found"}</p>
              <p className="mt-1 text-xs text-track-muted">Captain scores 2x. Vice-captain scores 1.5x. They must be different drivers.</p>
            </div>
            <LockoutCountdown lockoutAt={openEvent?.lockout_at} manualLock={openEvent?.manual_lock} />
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-black text-track-muted">Your team ownership</div>
              <div className="mt-1 text-3xl font-black">{selectedIds.length ? `${teamOwnershipSummary.averageOwnership}%` : "—"}</div>
              <p className="text-xs text-track-muted">
                {selectedIds.length ? `${teamOwnershipSummary.riskLevel} · ${teamOwnershipSummary.differentials} differentials · ${teamOwnershipSummary.uniquePicks} unique` : "Pick drivers to see your ownership profile."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-black text-track-muted">Most picked</div>
              <div className="mt-1 font-black">
                {mostPickedDriver ? `#${mostPickedDriver.driver.car_number} ${mostPickedDriver.driver.driver_name}` : "No picks yet"}
              </div>
              <p className="text-xs text-track-muted">
                {mostPickedDriver?.stats ? `${mostPickedDriver.stats.ownership}% ownership` : "Be the first to save a team."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-black text-track-muted">Captaincy insight</div>
              <div className="mt-1 font-black">
                {mostCaptainedDriver ? `#${mostCaptainedDriver.driver.car_number} ${mostCaptainedDriver.driver.driver_name}` : "No captains yet"}
              </div>
              <p className="text-xs text-track-muted">
                {mostCaptainedDriver?.stats ? `${mostCaptainedDriver.stats.captaincy}% captained` : "Captain data appears after teams are saved."}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-3xl border border-track-orange/30 bg-track-orange/10 p-4">
            <div className="font-black text-orange-100">Tap a driver card to add them to your roster</div>
            <p className="mt-1 text-sm text-track-muted">Start with Category A, choose one driver, then move through B, C, D, E and F. Your selected category will show as Picked.</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                disabled={eventLocked}
                className={`rounded-2xl border p-4 text-left font-black ${activeCategory === category ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`}
              >
                <div className="text-2xl">{category}</div>
                <div className="text-xs text-track-muted">{picks[category] ? "Picked" : "Choose"}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {categoryDrivers.map((driver) => {
              const stats = ownershipByDriver[driver.id];
              const label = driverOwnershipLabel(stats);

              return (
                <button
                  key={driver.id}
                  disabled={eventLocked}
                  className={`rounded-3xl border p-4 text-left transition hover:-translate-y-1 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${picks[driver.category] === driver.id ? "border-track-orange bg-track-orange/15" : "border-white/10 bg-white/5"}`}
                  onClick={() => setPicks((prev) => ({ ...prev, [driver.category]: driver.id }))}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 font-black">#{driver.car_number}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-black">{driver.driver_name}</div>
                        <span className={`pill ${ownershipBadgeClass(stats)}`}>{label}</span>
                        {picks[driver.category] === driver.id ? <span className="pill bg-green-500/15 text-green-100">Added</span> : null}
                      </div>
                      <div className="mt-1 text-sm text-track-muted">{driver.team_name}</div>
                      <div className="mt-1 text-xs text-track-muted">P{driver.points_position} · {driver.championship_points} pts</div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black sm:text-xs">
                        <div className="rounded-xl bg-black/20 p-2">
                          <div>{stats ? `${stats.ownership}%` : "0%"}</div>
                          <div className="text-[10px] text-track-muted">Picked</div>
                        </div>
                        <div className="rounded-xl bg-black/20 p-2">
                          <div>{stats ? `${stats.captaincy}%` : "0%"}</div>
                          <div className="text-[10px] text-track-muted">Captain</div>
                        </div>
                        <div className="rounded-xl bg-black/20 p-2">
                          <div>{stats ? `${stats.viceCaptaincy}%` : "0%"}</div>
                          <div className="text-[10px] text-track-muted">Vice</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-track-muted">Captain · 2x
              <select className="select mt-1" value={captain} disabled={eventLocked} onChange={(event) => selectCaptain(event.target.value)}>
                <option value="">Select captain</option>
                {selectedDriverOptions.filter((driver) => driver.id !== vice).map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.driver_name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-track-muted">Vice-captain · 1.5x
              <select className="select mt-1" value={vice} disabled={eventLocked} onChange={(event) => selectVice(event.target.value)}>
                <option value="">Select vice-captain</option>
                {selectedDriverOptions.filter((driver) => driver.id !== captain).map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.driver_name}</option>
                ))}
              </select>
            </label>
          </div>

          <button className="btn btn-primary mt-5 w-full" disabled={!teamComplete || savingTeam} onClick={saveTeam}>
            {savingTeam ? "Saving team..." : eventLocked ? "Round locked" : "Save team"}
          </button>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-black">Team completeness checklist</h3>
                <p className="text-sm text-track-muted">{completedChecklistItems}/{checklist.length} complete</p>
              </div>
              <div className={`pill ${teamComplete ? "bg-green-500/15 text-green-100" : ""}`}>
                {teamComplete ? "Ready to save" : "Keep picking"}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {checklist.map((item) => (
                <div key={item.label} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${item.complete ? "border-green-400/30 bg-green-500/10 text-green-100" : "border-white/10 bg-white/5 text-track-muted"}`}>
                  {item.complete ? "✓" : "○"} {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card space-y-4" style={{ background: `linear-gradient(135deg, ${garageColour}22, rgba(17,24,39,.86))` }}>
          <h2 className="text-2xl font-black">2. Garage / Team Name</h2>

          <input className="input" placeholder="Full name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <input className="input" placeholder="Garage / Team Name e.g. Thomas Performance Racing" value={garageName} onChange={(event) => setGarageName(event.target.value)} />

          <div id="shield" className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex items-center gap-4">
              <Shield baseColour={garageColour} patternColour={patternColour} pattern={pattern} number={number} size={96} />
              <div>
                <h3 className="text-xl font-black">Badge creator</h3>
                <p className="text-sm text-track-muted">Your banner colour and badge base colour are automatically the same.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-bold text-track-muted">Garage / badge base colour</div>
                <div className="grid grid-cols-5 gap-2">
                  {badgeColours.map((colour) => (
                    <button
                      key={colour.value}
                      type="button"
                      title={colour.name}
                      onClick={() => setGarageColour(colour.value)}
                      className={`h-10 rounded-xl border ${garageColour === colour.value ? "border-white ring-2 ring-track-orange" : "border-white/10"}`}
                      style={{ background: colour.value }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-bold text-track-muted">Pattern colour</div>
                <div className="grid grid-cols-5 gap-2">
                  {badgeColours.map((colour) => (
                    <button
                      key={colour.value}
                      type="button"
                      title={colour.name}
                      onClick={() => setPatternColour(colour.value)}
                      className={`h-10 rounded-xl border ${patternColour === colour.value ? "border-white ring-2 ring-track-orange" : "border-white/10"}`}
                      style={{ background: colour.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-track-muted">Pattern
                  <select className="select mt-1" value={pattern} onChange={(event) => setPattern(event.target.value)}>
                    {patternOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold text-track-muted">Number · max 3 characters
                  <input
                    className="input mt-1"
                    inputMode="numeric"
                    maxLength={3}
                    value={String(number).slice(0, 3)}
                    onChange={(event) => {
                      const cleaned = event.target.value.replace(/\D/g, "").slice(0, 3);
                      setNumber(Number(cleaned || 0));
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <button className="btn btn-primary w-full" disabled={!profileComplete || savingBadge} onClick={saveBadge}>
            {savingBadge ? "Saving badge..." : "Save badge"}
          </button>

          {errorMessage ? <div className="error">{errorMessage}</div> : null}
          {success ? <div className="success">{success}</div> : null}
        </section>
      </div>
    </div>
  );
}
