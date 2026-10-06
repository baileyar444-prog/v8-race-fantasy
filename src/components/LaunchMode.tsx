"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LockoutCountdown } from "@/components/LockoutCountdown";
import { createClient } from "@/lib/supabase/browser";

type OpenEvent = {
  id: string;
  name: string | null;
  full_name: string | null;
  lockout_at: string | null;
  manual_lock: boolean | null;
};

export function LaunchMode() {
  const supabase = createClient();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [savedTeams, setSavedTeams] = useState<number | null>(null);
  const [openEvent, setOpenEvent] = useState<OpenEvent | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        setIsLoggedIn(Boolean(authData.user));

        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });

        if (typeof count === "number") setMemberCount(Math.max(count, 150));

        const { data: eventData } = await supabase
          .from("events")
          .select("id,name,full_name,lockout_at,manual_lock")
          .eq("is_open_event", true)
          .maybeSingle();

        if (eventData) {
          setOpenEvent(eventData as OpenEvent);

          const { count: teamCount } = await supabase
            .from("fantasy_teams")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventData.id);

          if (typeof teamCount === "number") setSavedTeams(teamCount);
        }
      } catch {
        setMemberCount(150);
      }
    }

    load();
  }, [supabase]);

  const eventName = openEvent?.name ?? openEvent?.full_name ?? "the open round";
  const isBathurst = eventName.toLowerCase().includes("bathurst");
  const roundBadge = isBathurst ? "Bathurst special · 2x points" : "Free to play";
  const heroTitle = isBathurst ? "Bathurst 2x points special is live." : "V8 Race Fantasy is live.";
  const pickButton = isBathurst ? "Pick Bathurst" : "Pick team";

  return (
    <>
    {!isLoggedIn ? (
    <section className="relative overflow-hidden rounded-2xl border border-track-orange/40 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,.40),rgba(255,159,28,.22)_34%,rgba(0,0,0,.25)_72%)] p-3 shadow-2xl sm:hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <img
            src="/v8-race-fantasy-logo.png"
            alt="V8 Race Fantasy"
            className="h-12 w-12 rounded-2xl border border-white/10 object-cover shadow-glow"
          />
          <div className="min-w-0">
            <div className="pill mb-1">{roundBadge}</div>
            <h1 className="text-2xl font-black leading-none">V8 Race Fantasy</h1>
            <p className="mt-1 text-xs font-bold text-track-muted">{eventName} is open · 2x points · {memberCount ?? "150"}+ members</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Link className="rounded-xl bg-track-orange px-2 py-2 text-center text-xs font-black text-black" href="/pick-team">{pickButton}</Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center text-xs font-black" href="/leaderboard">Ladder</Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center text-xs font-black" href="/leagues?join=GRID88">GRID88</Link>
        </div>
        {isBathurst ? (
          <Link className="mt-2 block rounded-xl border border-track-orange/25 bg-track-orange/10 px-3 py-2 text-center text-xs font-black text-orange-100" href="/round-preview">
            See live Bathurst pick stats →
          </Link>
        ) : null}
      </div>
    </section>
    ) : null}

    <section className="relative hidden overflow-hidden rounded-[2rem] border border-track-orange/40 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,.36),rgba(255,159,28,.18)_38%,rgba(255,255,255,.05)_55%,rgba(0,0,0,.24))] p-5 shadow-2xl sm:block lg:p-8">
      <div className="absolute right-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-track-orange/25 blur-3xl" />
      <div className="absolute bottom-[-4rem] left-[-4rem] h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <div className="mb-5 flex items-center gap-4">
            <img
              src="/v8-race-fantasy-logo.png"
              alt="V8 Race Fantasy"
              className="h-24 w-24 rounded-3xl border border-white/10 object-cover shadow-glow"
            />
            <div>
              <div className="pill mb-2">{roundBadge}</div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                {heroTitle}
              </h1>
            </div>
          </div>

          <p className="mb-6 max-w-3xl text-lg text-track-muted">
            {memberCount ?? "150"}+ members have already joined. Pick your {eventName} team for a Bathurst special, choose captain and vice-captain, join leagues and take on the biggest race of the year.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link className="btn btn-primary" href="/pick-team">{pickButton}</Link>
            <Link className="btn" href="/drivers">Driver stats</Link>
            <Link className="btn" href="/leagues?join=GRID88">Join GRID88</Link>
            <Link className="btn" href="/round-preview">Live Bathurst stats</Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-black text-track-muted">Members</div>
              <div className="mt-1 text-2xl font-black">{memberCount ?? "150"}+</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-black text-track-muted">Open round</div>
              <div className="mt-1 text-2xl font-black">{eventName}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-black text-track-muted">Bathurst bonus</div>
              <div className="mt-1 text-2xl font-black">2x</div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
          <div className="text-sm font-black uppercase tracking-[.22em] text-track-muted">Bathurst special</div>
          <h2 className="mt-2 text-2xl font-black">{eventName} · 2x points</h2>
          <div className="mt-4">
            <LockoutCountdown lockoutAt={openEvent?.lockout_at} manualLock={openEvent?.manual_lock} />
            {isBathurst ? <div className="mt-2 text-center text-xs font-black text-orange-100">Friday 9 October · 3:15 PM AEST</div> : null}
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-white/5 p-4"><strong>1.</strong> Pick one driver from each category A–F.</div>
            <div className="rounded-2xl bg-white/5 p-4"><strong>2.</strong> Bathurst is double points. Captain scores 2x and vice-captain scores 1.5x.</div>
            <div className="rounded-2xl bg-white/5 p-4"><strong>3.</strong> Create or join a league, or jump straight into GRID88.</div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
