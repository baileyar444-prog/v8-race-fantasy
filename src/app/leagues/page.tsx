"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { makeShareCode } from "@/lib/share-code";

type Profile = {
  id: string;
  display_name: string | null;
  garage_name: string | null;
  banner_colour: string | null;
  shield_base_colour: string | null;
  shield_pattern_colour: string | null;
  shield_pattern: string | null;
  shield_number: number | null;
};

type League = {
  id: string;
  name: string;
  share_code: string;
  created_by: string | null;
  is_public: boolean;
};

type Member = {
  league_id: string;
  user_id: string;
};

export default function LeaguesPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setLoading(false);
        return;
      }

      setUserId(authData.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,display_name,garage_name,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number")
        .eq("id", authData.user.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id,name,share_code,created_by,is_public")
        .order("created_at", { ascending: false });

      if (leagueError) throw leagueError;

      const { data: memberData, error: memberError } = await supabase
        .from("league_members")
        .select("league_id,user_id");

      if (memberError) throw memberError;

      setLeagues((leagueData ?? []) as League[]);
      setMembers((memberData ?? []) as Member[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load leagues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const myLeagueIds = useMemo(() => {
    return members.filter((member) => member.user_id === userId).map((member) => member.league_id);
  }, [members, userId]);

  const myLeagues = useMemo(() => {
    return leagues.filter((league) => myLeagueIds.includes(league.id));
  }, [leagues, myLeagueIds]);

  function countMembers(leagueId: string) {
    return members.filter((member) => member.league_id === leagueId).length;
  }

  async function createLeague() {
    setBusy(true);
    setErrorMessage("");
    setSuccess("");

    try {
      if (!userId) throw new Error("You need to log in first.");
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
      setSuccess(`League created. Share code: ${league.share_code}`);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create league.");
    } finally {
      setBusy(false);
    }
  }

  async function joinLeague() {
    setBusy(true);
    setErrorMessage("");
    setSuccess("");

    try {
      if (!userId) throw new Error("You need to log in first.");
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Enter a league code.");

      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("id,name,share_code")
        .eq("share_code", code)
        .maybeSingle();

      if (leagueError) throw leagueError;
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

      setJoinCode("");
      setSuccess(`Joined ${league.name}.`);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not join league.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveLeague(leagueId: string) {
    setBusy(true);
    setErrorMessage("");
    setSuccess("");

    try {
      if (!userId) throw new Error("You need to log in first.");

      const { error } = await supabase
        .from("league_members")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", userId);

      if (error) throw error;

      setSuccess("Left league.");
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not leave league.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="card">Loading leagues...</div>;
  }

  if (!userId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Private leagues" title="Leagues">
          Log in to create or join a league.
        </PageHeader>
        <Link className="btn btn-primary" href="/login">Log in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Private leagues" title="Leagues">
        Create a league, share the code with your mates, then view a filtered ladder.
      </PageHeader>

      {profile && (
        <div className="card flex items-center gap-4" style={{ background: profile.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}22, rgba(17,24,39,.86))` : undefined }}>
          <Shield
            number={profile.shield_number ?? 88}
            baseColour={profile.shield_base_colour ?? "#ff7a1a"}
            patternColour={profile.shield_pattern_colour ?? "#111827"}
            pattern={profile.shield_pattern ?? "chevron"}
            size={64}
          />
          <div>
            <div className="font-black">{profile.garage_name ?? "Your Garage"}</div>
            <div className="text-sm text-track-muted">{profile.display_name ?? "Manager"}</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-2xl font-black">Create league</h2>
          <input
            className="input"
            placeholder="League name, e.g. Friends Championship"
            value={newLeagueName}
            onChange={(event) => setNewLeagueName(event.target.value)}
          />
          <button className="btn btn-primary w-full" disabled={busy} onClick={createLeague}>
            Create league
          </button>
        </section>

        <section className="card space-y-3">
          <h2 className="text-2xl font-black">Join league</h2>
          <input
            className="input uppercase"
            placeholder="Enter code, e.g. GRID88"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          />
          <button className="btn btn-primary w-full" disabled={busy} onClick={joinLeague}>
            Join league
          </button>
        </section>
      </div>

      {errorMessage ? <div className="error">{errorMessage}</div> : null}
      {success ? <div className="success">{success}</div> : null}

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black">Your leagues</h2>
            <p className="text-sm text-track-muted">Each league has its own ladder link.</p>
          </div>
          <Link className="btn" href="/leaderboard">Overall ladder</Link>
        </div>

        {myLeagues.length ? (
          <div className="grid gap-3">
            {myLeagues.map((league) => (
              <div key={league.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="text-2xl font-black">{league.name}</div>
                    <div className="mt-1 text-sm text-track-muted">
                      Code {league.share_code} · {countMembers(league.id)} member{countMembers(league.id) === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link className="btn btn-primary" href={`/leaderboard?league=${league.share_code}`}>
                      View ladder
                    </Link>
                    <button className="btn" disabled={busy} onClick={() => navigator.clipboard.writeText(league.share_code)}>
                      Copy code
                    </button>
                    <button className="btn" disabled={busy} onClick={() => leaveLeague(league.id)}>
                      Leave
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-track-muted">
            You are not in any leagues yet. Create one or join with a code.
          </div>
        )}
      </section>
    </div>
  );
}
