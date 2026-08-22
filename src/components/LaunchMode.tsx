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

  return (
    <>
    {!isLoggedIn ? (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-track-orange/30 via-white/5 to-black p-3 shadow-2xl sm:hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <img
            src="/v8-race-fantasy-logo.png"
            alt="V8 Race Fantasy"
            className="h-12 w-12 rounded-2xl border border-white/10 object-cover shadow-glow"
          />
          <div className="min-w-0">
            <div className="pill mb-1">Free to play</div>
            <h1 className="text-2xl font-black leading-none">V8 Race Fantasy</h1>
            <p className="mt-1 text-xs font-bold text-track-muted">{eventName} is open · {memberCount ?? "150"}+ members</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Link className="rounded-xl bg-track-orange px-2 py-2 text-center text-xs font-black text-black" href="/pick-team">Pick team</Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center text-xs font-black" href="/leaderboard">Ladder</Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center text-xs font-black" href="/leagues?join=GRID88">GRID88</Link>
        </div>
      </div>
    </section>
    ) : null}

    <section className="relative hidden overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-track-orange/30 via-white/5 to-black p-6 shadow-2xl sm:block lg:p-10">
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
              <div className="pill mb-2">Launch mode · Free to play</div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                V8 Race Fantasy is live.
              </h1>
            </div>
          </div>

          <p className="mb-6 max-w-3xl text-lg text-track-muted">
            {memberCount ?? "150"}+ members have already joined. Pick your {eventName} team, choose captain and vice-captain, join leagues and take on the V8 Supercars run home.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link className="btn btn-primary" href="/get-started">Get started</Link>
            <Link className="btn" href="/pick-team">Pick team</Link>
            <Link className="btn" href="/leagues?join=GRID88">Join GRID88</Link>
            <Link className="btn" href="/round-preview">Round preview</Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-black text-track-muted">Members</div>
              <div className="mt-1 text-3xl font-black">{memberCount ?? "150"}+</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-black text-track-muted">Open round</div>
              <div className="mt-1 text-2xl font-black">{eventName}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-black text-track-muted">Registered players</div>
              <div className="mt-1 text-3xl font-black">{memberCount ?? "150"}+</div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
          <div className="text-sm font-black uppercase tracking-[.22em] text-track-muted">Current round</div>
          <h2 className="mt-2 text-3xl font-black">{eventName}</h2>
          <div className="mt-4">
            <LockoutCountdown lockoutAt={openEvent?.lockout_at} manualLock={openEvent?.manual_lock} />
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-white/5 p-4"><strong>1.</strong> Pick one driver from each category A–F.</div>
            <div className="rounded-2xl bg-white/5 p-4"><strong>2.</strong> Captain scores 2x. Vice-captain scores 1.5x.</div>
            <div className="rounded-2xl bg-white/5 p-4"><strong>3.</strong> Create or join a league, or jump straight into GRID88.</div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
