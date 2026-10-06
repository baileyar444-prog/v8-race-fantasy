"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { makeShareCode } from "@/lib/share-code";
import { storePendingLeagueJoin } from "@/lib/pending-league";
import { friendlyDataError } from "@/lib/friendly-error";

const COMMUNITY_CODE = "GRID88";
const COMMUNITY_NAME = "V8 Race Fantasy Community League";

export function HomeQuickStart() {
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState(COMMUNITY_CODE);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? "");
    }

    load();
  }, [supabase]);

  async function joinLeagueByCode(rawCode: string) {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const code = rawCode.trim().toUpperCase();
      if (!code) throw new Error("Enter a league code.");

      if (!userId) {
        storePendingLeagueJoin(code);
        window.location.href = `/login?join=${encodeURIComponent(code)}`;
        return;
      }

      let { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("id,name,share_code")
        .eq("share_code", code)
        .maybeSingle();

      if (leagueError) throw leagueError;

      if (!league && code === COMMUNITY_CODE) {
        const { data: created, error: createError } = await supabase
          .from("leagues")
          .insert({
            name: COMMUNITY_NAME,
            share_code: COMMUNITY_CODE,
            created_by: userId,
            is_public: true
          })
          .select("id,name,share_code")
          .single();

        if (createError) throw createError;
        league = created;
      }

      if (!league) throw new Error("No league found with that code.");

      const { error: memberError } = await supabase
        .from("league_members")
        .upsert(
          {
            league_id: league.id,
            user_id: userId
          },
          { onConflict: "league_id,user_id" }
        );

      if (memberError) throw memberError;

      setMessage(`Joined ${league.name}.`);
      setJoinCode(code);
    } catch (error) {
      setErrorMessage(friendlyDataError(error, "Could not join league."));
    } finally {
      setBusy(false);
    }
  }

  async function createLeague() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!userId) {
        window.location.href = "/login";
        return;
      }

      const name = newLeagueName.trim();
      if (!name) throw new Error("Enter a league name.");

      const shareCode = makeShareCode(name);

      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .insert({
          name,
          share_code: shareCode,
          created_by: userId,
          is_public: false
        })
        .select("id,name,share_code")
        .single();

      if (leagueError) throw leagueError;

      const { error: memberError } = await supabase
        .from("league_members")
        .insert({
          league_id: league.id,
          user_id: userId
        });

      if (memberError) throw memberError;

      setNewLeagueName("");
      setMessage(`League created. Share code: ${league.share_code}.`);
    } catch (error) {
      setErrorMessage(friendlyDataError(error, "Could not create league."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="pill mb-2">Home base</div>
          <h2 className="text-xl font-black sm:text-2xl">Get on the grid from the home page</h2>
          <p className="mt-1 hidden text-track-muted sm:block">
            Create your garage, pick your team, join a league, check driver stats and share your team.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link className="btn btn-primary px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/pick-team">Pick The Bend</Link>
          <Link className="btn px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/drivers">Driver stats</Link>
        </div>
      </div>

      {message ? <div className="success mb-3">{message}</div> : null}
      {errorMessage ? <div className="error mb-3">{errorMessage}</div> : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/login">
          <div className="text-base font-black sm:text-xl">{userId ? "Account ready" : "Create account"}</div>
          <p className="mt-1 hidden text-sm text-track-muted sm:block">Sign up and create your fantasy garage.</p>
        </Link>
        <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/pick-team">
          <div className="text-base font-black sm:text-xl">Pick team</div>
          <p className="mt-1 hidden text-sm text-track-muted sm:block">Choose your six drivers and captaincy.</p>
        </Link>
        <button className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 disabled:opacity-60 sm:rounded-2xl sm:p-4" disabled={busy} onClick={() => joinLeagueByCode(COMMUNITY_CODE)}>
          <div className="text-base font-black sm:text-xl">Join GRID88</div>
          <p className="mt-1 hidden text-sm text-track-muted sm:block">Join the official community league.</p>
        </button>
        <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/share-team">
          <div className="text-base font-black sm:text-xl">Share team</div>
          <p className="mt-1 hidden text-sm text-track-muted sm:block">Download a team card or story asset.</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
          <h3 className="font-black sm:text-xl">Join an existing league</h3>
          <p className="mt-1 hidden text-sm text-track-muted sm:block">Paste a mate's code, or use GRID88.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="input uppercase"
              placeholder="GRID88"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
            <button className="btn btn-primary" disabled={busy} onClick={() => joinLeagueByCode(joinCode)}>Join</button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
          <h3 className="font-black sm:text-xl">Create your own league</h3>
          <p className="mt-1 hidden text-sm text-track-muted sm:block">Perfect for mates, family, work groups or group chats.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="input"
              placeholder="League name"
              value={newLeagueName}
              onChange={(event) => setNewLeagueName(event.target.value)}
            />
            <button className="btn btn-primary" disabled={busy} onClick={createLeague}>Create</button>
          </div>
        </div>
      </div>
    </section>
  );
}
