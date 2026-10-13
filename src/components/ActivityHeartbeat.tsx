"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

export function ActivityHeartbeat() {
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function markActive() {
      if (cancelled) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { error } = await supabase.rpc("mark_user_activity");

      if (error) {
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", data.user.id);
      }
    }

    markActive();

    const interval = window.setInterval(markActive, 45000);

    function onFocusOrVisible() {
      if (document.visibilityState === "visible") markActive();
    }

    window.addEventListener("focus", markActive);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", markActive);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [supabase]);

  return null;
}
