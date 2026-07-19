"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";

const COMMUNITY_LEAGUE_NAME = "V8 Race Fantasy Community League";
const COMMUNITY_LEAGUE_CODE = "GRID88";

export default function CommunityPage() {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function joinCommunityLeague() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: existingLeague, error: findError } = await supabase
        .from("leagues")
        .select("id,name,share_code")
        .eq("share_code", COMMUNITY_LEAGUE_CODE)
        .maybeSingle();

      if (findError) throw findError;

      let league = existingLeague;

      if (!league) {
        const { data: createdLeague, error: createError } = await supabase
          .from("leagues")
          .insert({
            name: COMMUNITY_LEAGUE_NAME,
            share_code: COMMUNITY_LEAGUE_CODE,
            created_by: authData.user.id,
            is_public: true
          })
          .select("id,name,share_code")
          .single();

        if (createError) throw createError;
        league = createdLeague;
      }

      if (!league?.id) throw new Error("Could not find or create the community league.");

      const { error: memberError } = await supabase
        .from("league_members")
        .upsert(
          {
            league_id: league.id,
            user_id: authData.user.id
          },
          { onConflict: "league_id,user_id" }
        );

      if (memberError) throw memberError;

      setMessage(`Joined ${COMMUNITY_LEAGUE_NAME}. Opening ladder...`);
      window.location.href = `/leaderboard?league=${COMMUNITY_LEAGUE_CODE}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not join the community league.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Community" title="V8 Race Fantasy partners">
        Free-to-play, fan-made and built around community leagues.
      </PageHeader>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-xl font-black">Free to play</h2>
          <p className="mt-2 text-track-muted">No paid entry. Build your garage, pick your drivers and compete with mates.</p>
        </div>

        <a
          className="card block transition hover:-translate-y-1 hover:bg-white/10"
          href="https://www.instagram.com/makesupercarsv8again/"
          target="_blank"
          rel="noreferrer"
        >
          <div className="pill mb-3">Sponsor</div>
          <h2 className="text-xl font-black">Make Supercars V8 Again</h2>
          <p className="mt-2 text-track-muted">Follow the community sponsor on Instagram.</p>
        </a>

        <div className="card">
          <div className="pill mb-3">Creator league</div>
          <h2 className="text-xl font-black">{COMMUNITY_LEAGUE_NAME}</h2>
          <p className="mt-2 text-track-muted">Code {COMMUNITY_LEAGUE_CODE}. Join the official community ladder in one click.</p>
          <button className="btn btn-primary mt-4 w-full" disabled={busy} onClick={joinCommunityLeague}>
            {busy ? "Joining..." : "Join community league"}
          </button>
        </div>
      </div>
    </div>
  );
}
