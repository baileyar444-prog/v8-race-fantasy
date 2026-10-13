"use client";

import { canonicalAppUrl } from "@/lib/site";
import Link from "next/link";
import { useState } from "react";

type InviteMatesPromptProps = {
  leagueCode?: string;
  compact?: boolean;
};

export function InviteMatesPrompt({ leagueCode = "GRID88", compact = false }: InviteMatesPromptProps) {
  const [message, setMessage] = useState("");

  async function shareApp() {
    const baseUrl = canonicalAppUrl;
    const text = `The Supercars Finals are here 🏁\n\nBuild your V8 Race Fantasy team for the Gold Coast 500 and see how you stack up against the grid.\n\nJoin my league or jump into the community league.\nCode: ${leagueCode}\n\n${baseUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join V8 Race Fantasy",
          text,
          url: baseUrl
        });
        setMessage("Invite shared.");
        return;
      }

      await navigator.clipboard.writeText(text);
      setMessage("Invite message copied. Paste it into a text, DM or group chat.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Could not open share. Try copying the link instead.");
    }
  }

  return (
    <section className={`rounded-3xl border border-[#f6c453]/30 bg-[#f6c453]/10 ${compact ? "p-4" : "p-5"} shadow-glow`}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="pill finals-pill mb-3">Supercars Finals</div>
          <h2 className={`${compact ? "text-xl" : "text-2xl"} font-black`}>Bring your mates into the Finals.</h2>
          <p className="mt-2 text-sm text-track-muted">
            Bathurst is done and the Gold Coast 500 starts the Finals. Share the app, invite a league, or post your team card.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={shareApp}>Share invite</button>
          <Link className="btn" href="/share-team">Share team card</Link>
          <Link className="btn" href="/leagues">Share league</Link>
        </div>
      </div>
      {message ? <div className="success mt-3">{message}</div> : null}
    </section>
  );
}
