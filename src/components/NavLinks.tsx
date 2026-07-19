"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const publicNav = [
  ["Home", "/"],
  ["Pick Team", "/pick-team"],
  ["My Team", "/team-history"],
  ["Leagues", "/leagues"],
  ["Leaderboard", "/leaderboard"],
  ["Rules", "/rules"],
  ["Community", "/community"]
];

export function NavLinks() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setIsAdmin(false);
        setLoaded(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

      setIsAdmin(profile?.role === "admin");
      setLoaded(true);
    }

    loadRole();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <nav className="hidden flex-wrap items-center gap-2 lg:flex">
      {publicNav.map(([label, href]) => (
        <Link key={href} href={href} className="rounded-full px-3 py-2 text-sm font-bold text-track-muted hover:bg-white/10 hover:text-white">
          {label}
        </Link>
      ))}

      {loaded && isAdmin ? (
        <>
          <Link href="/race-control" className="rounded-full border border-track-orange/40 bg-track-orange/10 px-3 py-2 text-sm font-black text-orange-100 hover:bg-track-orange/20">
            Race Control
          </Link>
          <Link href="/admin-stats" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-orange-100 hover:bg-white/10">
            Stats
          </Link>
        </>
      ) : null}
    </nav>
  );
}
