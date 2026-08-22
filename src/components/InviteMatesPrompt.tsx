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
    const text = `I just joined V8 Race Fantasy 🏁\n\nBuild your garage, pick your drivers and take on the run home.\n\nJoin my league or jump into the community league.\nCode: ${leagueCode}\n\n${baseUrl}`;

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
    <section className={`rounded-3xl border border-track-orange/30 bg-track-orange/10 ${compact ? "p-4" : "p-5"} shadow-glow`}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="pill mb-3">Invite mates bonus</div>
          <h2 className={`${compact ? "text-xl" : "text-2xl"} font-black`}>Your team is locked in. Now bring your mates in.</h2>
          <p className="mt-2 text-sm text-track-muted">
            Share the app, invite a league, or post your team card to get more people on the grid.
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
