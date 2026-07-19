"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";

type Profile = {
  display_name: string | null;
  garage_name: string | null;
  role: string | null;
  banner_colour: string | null;
  shield_base_colour: string | null;
  shield_pattern_colour: string | null;
  shield_pattern: string | null;
  shield_number: number | null;
};

export function ProfileMenu() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoaded(true);
        return;
      }

      setEmail(userData.user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("display_name,garage_name,role,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number")
        .eq("id", userData.user.id)
        .maybeSingle();

      setProfile(data);
      setLoaded(true);
    }

    loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
        <Shield number={88} size={36} />
        <div className="hidden text-left sm:block">
          <div className="text-sm font-black">Loading...</div>
          <div className="text-xs text-track-muted">Profile</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-track-orange px-3 py-2 text-xs font-black text-black shadow-glow hover:bg-orange-300 sm:px-5 sm:py-3 sm:text-sm"
      >
        <span className="sm:hidden">Sign up</span>
        <span className="hidden sm:inline">Create account</span>
      </Link>
    );
  }

  return (
    <div className="group relative">
      <button className="flex items-center gap-3 rounded-full border border-white/10 px-3 py-2" style={{ background: profile.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}33, rgba(255,255,255,.05))` : undefined }}>
        <Shield
          number={profile.shield_number ?? 88}
          baseColour={profile.shield_base_colour ?? "#ff7a1a"}
          patternColour={profile.shield_pattern_colour ?? "#111827"}
          pattern={profile.shield_pattern ?? "chevron"}
          size={36}
        />
        <div className="hidden text-left sm:block">
          <div className="text-sm font-black">{profile.garage_name ?? "Your Garage"}</div>
          <div className="text-xs text-track-muted">{email}</div>
        </div>
      </button>

      <div className="invisible absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#101827] p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
        <div className="border-b border-white/10 px-3 py-3">
          <div className="font-black">{profile.display_name ?? "Manager"}</div>
          <div className="text-sm text-track-muted">{profile.garage_name ?? "Garage"}</div>
        </div>
        <Link href="/onboarding" className="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10">
          Garage setup
        </Link>
        <Link href="/pick-team" className="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10">
          Edit team
        </Link>
        <Link href="/team-history" className="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10">
          My Team history
        </Link>
        <Link href="/leaderboard" className="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10">
          Leaderboard
        </Link>
        {profile.role === "admin" ? (
          <>
            <Link href="/race-control" className="block rounded-xl px-3 py-2 text-sm font-black text-orange-100 hover:bg-track-orange/10">
              Race Control
            </Link>
            <Link href="/admin-stats" className="block rounded-xl px-3 py-2 text-sm font-black text-orange-100 hover:bg-track-orange/10">
              Website statistics
            </Link>
          </>
        ) : null}
        <button onClick={logout} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-200 hover:bg-red-500/10">
          Log out
        </button>
      </div>
    </div>
  );
}
