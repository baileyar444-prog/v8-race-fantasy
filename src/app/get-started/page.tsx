"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";
import { makeShareCode } from "@/lib/share-code";
import { storePendingLeagueJoin } from "@/lib/pending-league";

const COMMUNITY_CODE = "GRID88";
const COMMUNITY_NAME = "V8 Race Fantasy Community League";

export default function GetStartedPage() {
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
      if (!userId) {
        const code = rawCode.trim().toUpperCase();
        storePendingLeagueJoin(code);
        window.location.href = `/login?join=${encodeURIComponent(code)}`;
        return;
      }

      const code = rawCode.trim().toUpperCase();
      if (!code) throw new Error("Enter a league code.");

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
      setErrorMessage(error instanceof Error ? error.message : "Could not join league.");
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
      setErrorMessage(error instanceof Error ? error.message : "Could not create league.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Quick start" title="Get started with V8 Race Fantasy">
        Follow the simple path: create an account, pick your team, join a league and invite your mates.
      </PageHeader>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="card">
          <div className="pill mb-3">Step 1</div>
          <h2 className="text-2xl font-black">Create account</h2>
          <p className="mt-2 text-track-muted">Sign up and create your fantasy garage.</p>
          <Link className="btn btn-primary mt-4 w-full" href="/login">{userId ? "Account ready" : "Create account"}</Link>
        </div>

        <div className="card">
          <div className="pill mb-3">Step 2</div>
          <h2 className="text-2xl font-black">Pick team</h2>
          <p className="mt-2 text-track-muted">Choose one driver from each category, then lock in captain and vice. Ipswich uses the updated post-Perth classes with 26 cars available.</p>
          <Link className="btn btn-primary mt-4 w-full" href="/pick-team">Pick drivers</Link>
        </div>

        <div className="card">
          <div className="pill mb-3">Step 3</div>
          <h2 className="text-2xl font-black">Join GRID88</h2>
          <p className="mt-2 text-track-muted">Join the official community league in one click.</p>
          <button className="btn btn-primary mt-4 w-full" disabled={busy} onClick={() => joinLeagueByCode(COMMUNITY_CODE)}>
            Join community league
          </button>
        </div>

        <div className="card">
          <div className="pill mb-3">Step 4</div>
          <h2 className="text-2xl font-black">Share it</h2>
          <p className="mt-2 text-track-muted">Download team cards and story assets for Instagram.</p>
          <Link className="btn btn-primary mt-4 w-full" href="/share-team">Share team</Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="text-2xl font-black">Create your own league</h2>
          <p className="text-sm text-track-muted">Perfect for mates, family, work groups or group chats.</p>
          <input
            className="input"
            placeholder="League name, e.g. Saturday Arvo Legends"
            value={newLeagueName}
            onChange={(event) => setNewLeagueName(event.target.value)}
          />
          <button className="btn btn-primary w-full" disabled={busy} onClick={createLeague}>Create league</button>
        </div>

        <div className="card space-y-3">
          <h2 className="text-2xl font-black">Join an existing league</h2>
          <p className="text-sm text-track-muted">Paste a code from your mates, or use GRID88 for the community league.</p>
          <input
            className="input uppercase"
            placeholder="GRID88"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          />
          <button className="btn btn-primary w-full" disabled={busy} onClick={() => joinLeagueByCode(joinCode)}>Join league</button>
        </div>
      </section>

      <section className="card">
        <div className="mb-4">
          <div className="pill mb-3">Next up</div>
          <h2 className="text-2xl font-black">Useful launch pages</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href="/round-preview">Round preview</Link>
          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href="/story-assets">Instagram story assets</Link>
          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href="/leaderboard">Leaderboard</Link>
          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href="/leagues">Leagues</Link>
        </div>
      </section>
    </div>
  );
}
