"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Shield } from "@/components/Shield";
import { createClient } from "@/lib/supabase/browser";
import { categories } from "@/lib/mock-data";
import { canonicalAppUrl } from "@/lib/site";

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

type EventRow = {
  id: string;
  name: string | null;
  full_name: string | null;
  is_open_event: boolean;
};

type PickRow = {
  category: string;
  driver_id: string;
  drivers?: {
    driver_name: string | null;
    team_name: string | null;
    car_number: string | null;
  } | null;
};

type TeamRow = {
  id: string;
  captain_driver_id: string | null;
  vice_captain_driver_id: string | null;
  fantasy_team_picks?: PickRow[];
};

type ScoreRow = {
  user_id: string;
  published_score: number | null;
};

function escapeXml(value: string | null | undefined) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadSvgFallback(filename: string, svg: string) {
  downloadBlob(filename.replace(".png", ".svg"), new Blob([svg], { type: "image/svg+xml" }));
}

function downloadSvgAsPng(filename: string, svg: string, width: number, height: number) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      downloadSvgFallback(filename, svg);
      return;
    }

    context.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (blob) {
        downloadBlob(filename, blob);
      } else {
        downloadSvgFallback(filename, svg);
      }
    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    downloadSvgFallback(filename, svg);
  };

  image.src = url;
}

function makeTeamSvg(profile: Profile | null, eventName: string, picks: PickRow[], captainId: string | null, viceId: string | null, width = 1080, height = 1080) {
  const garageName = escapeXml(profile?.garage_name ?? "My Garage");
  const lines = [...picks]
    .sort((a, b) => a.category.localeCompare(b.category))
    .map((pick) => {
      const marker = pick.driver_id === captainId ? "C 2x" : pick.driver_id === viceId ? "VC 1.5x" : "";
      return {
        category: escapeXml(`Category ${pick.category}`),
        driver: escapeXml(`#${pick.drivers?.car_number ?? "?"} ${pick.drivers?.driver_name ?? "Driver"}`),
        team: escapeXml(pick.drivers?.team_name ?? ""),
        marker
      };
    });

  const rows = lines.map((line, index) => {
    const y = 360 + index * 82;
    return `
      <rect x="90" y="${y - 34}" width="${width - 180}" height="68" rx="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)"/>
      <text x="120" y="${y - 8}" fill="#a8b5c9" font-size="22" font-family="Arial" font-weight="800">${line.category}</text>
      <text x="120" y="${y + 22}" fill="#ffffff" font-size="31" font-family="Arial" font-weight="900">${line.driver}</text>
      <text x="${width - 135}" y="${y + 12}" fill="#ffb84d" font-size="24" font-family="Arial" font-weight="900" text-anchor="end">${line.marker}</text>
    `;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff7a1a"/>
        <stop offset="35%" stop-color="#151b28"/>
        <stop offset="100%" stop-color="#070a10"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${width - 90}" cy="95" r="170" fill="#ff7a1a" opacity="0.16"/>
    <circle cx="20" cy="${height - 20}" r="220" fill="#ffb84d" opacity="0.10"/>
    <rect x="50" y="50" width="${width - 100}" height="${height - 100}" rx="46" fill="rgba(7,10,16,0.70)" stroke="rgba(255,255,255,0.18)"/>
    <text x="90" y="145" fill="#ffb84d" font-size="28" font-family="Arial" font-weight="900" letter-spacing="5">V8 RACE FANTASY</text>
    <text x="90" y="215" fill="#ffffff" font-size="62" font-family="Arial" font-weight="900">${garageName}</text>
    <text x="90" y="270" fill="#a8b5c9" font-size="31" font-family="Arial" font-weight="800">${escapeXml(eventName)} team locked in</text>
    ${rows}
    <rect x="90" y="${height - 150}" width="${width - 180}" height="76" rx="24" fill="#ff7a1a"/>
    <text x="${width / 2}" y="${height - 102}" text-anchor="middle" fill="#100701" font-size="34" font-family="Arial" font-weight="900">JOIN AT V8RACEFANTASY.COM</text>
  </svg>`;
}

export default function ShareTeamPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [allScores, setAllScores] = useState<ScoreRow[]>([]);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        window.location.href = "/login";
        return;
      }

      setUserId(authData.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,display_name,garage_name,banner_colour,shield_base_colour,shield_pattern_colour,shield_pattern,shield_number")
        .eq("id", authData.user.id)
        .maybeSingle();

      setProfile(profileData as Profile | null);

      const { data: eventData } = await supabase
        .from("events")
        .select("id,name,full_name,is_open_event")
        .eq("is_open_event", true)
        .maybeSingle();

      setEvent(eventData as EventRow | null);

      if (eventData?.id) {
        const { data: teamData } = await supabase
          .from("fantasy_teams")
          .select("id,captain_driver_id,vice_captain_driver_id,fantasy_team_picks(category,driver_id,drivers(driver_name,team_name,car_number))")
          .eq("user_id", authData.user.id)
          .eq("event_id", eventData.id)
          .maybeSingle();

        setTeam(teamData as unknown as TeamRow | null);
      }

      const { data: scoreData } = await supabase
        .from("fantasy_scores")
        .select("user_id,published_score");

      setAllScores((scoreData ?? []) as ScoreRow[]);
      setLoading(false);
    }

    load();
  }, [supabase]);

  const eventName = event?.name ?? event?.full_name ?? "Current round";
  const picks = team?.fantasy_team_picks ?? [];

  const rank = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const score of allScores) {
      totals[score.user_id] = (totals[score.user_id] ?? 0) + Number(score.published_score ?? 0);
    }

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const index = sorted.findIndex(([id]) => id === userId);
    return index >= 0 ? index + 1 : null;
  }, [allScores, userId]);

  const shareText = useMemo(() => {
    const lines = [...picks]
      .sort((a, b) => a.category.localeCompare(b.category))
      .map((pick) => {
        const role = pick.driver_id === team?.captain_driver_id ? " (C)" : pick.driver_id === team?.vice_captain_driver_id ? " (VC)" : "";
        return `${pick.category}: #${pick.drivers?.car_number ?? "?"} ${pick.drivers?.driver_name ?? "Driver"}${role}`;
      });

    return `${profile?.garage_name ?? "My Garage"} is locked in for ${eventName} 🏁\n\n${lines.join("\n")}\n\nJoin V8 Race Fantasy: ${canonicalAppUrl}`;
  }, [picks, profile?.garage_name, eventName, team?.captain_driver_id, team?.vice_captain_driver_id]);

  async function shareTeam() {
    const url = canonicalAppUrl;

    try {
      if (navigator.share) {
        await navigator.share({ title: "My V8 Race Fantasy team", text: shareText, url });
        setMessage("Team shared.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setMessage("Team caption copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Could not share. Try copying the caption.");
    }
  }

  function copyCaption() {
    navigator.clipboard.writeText(shareText);
    setMessage("Caption copied.");
  }

  function downloadSquare() {
    downloadSvgAsPng(
      "v8-race-fantasy-team-card.png",
      makeTeamSvg(profile, eventName, picks, team?.captain_driver_id ?? null, team?.vice_captain_driver_id ?? null, 1080, 1080),
      1080,
      1080
    );
    setMessage("Downloaded square team card.");
  }

  function downloadStory() {
    downloadSvgAsPng(
      "v8-race-fantasy-instagram-story.png",
      makeTeamSvg(profile, eventName, picks, team?.captain_driver_id ?? null, team?.vice_captain_driver_id ?? null, 1080, 1920),
      1080,
      1920
    );
    setMessage("Downloaded Instagram story card.");
  }

  if (loading) return <div className="card">Loading your share card...</div>;

  if (!team || picks.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Share team" title="No saved team yet">
          Save your team first, then come back to download your team card.
        </PageHeader>
        <Link className="btn btn-primary" href="/pick-team">Pick team</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Share team" title="Shareable team card">
        Download a card for Instagram stories, copy your caption or share it straight to mates.
      </PageHeader>

      {message ? <div className="success">{message}</div> : null}

      <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="card" style={{ background: profile?.banner_colour ? `linear-gradient(135deg, ${profile.banner_colour}22, rgba(17,24,39,.86))` : undefined }}>
          <div className="mb-4 flex items-center gap-4">
            <Shield
              number={profile?.shield_number ?? 88}
              baseColour={profile?.shield_base_colour ?? "#ff7a1a"}
              patternColour={profile?.shield_pattern_colour ?? "#111827"}
              pattern={profile?.shield_pattern ?? "chevron"}
              size={72}
            />
            <div>
              <div className="pill mb-2">{eventName}</div>
              <h2 className="text-3xl font-black">{profile?.garage_name ?? "Your Garage"}</h2>
              <p className="text-sm text-track-muted">{rank ? `Overall rank #${rank}` : "Rank appears after scores are published"}</p>
            </div>
          </div>

          <div className="space-y-2">
            {[...picks].sort((a, b) => a.category.localeCompare(b.category)).map((pick) => (
              <div key={pick.category} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-track-muted">Category {pick.category}</div>
                    <div className="font-black">#{pick.drivers?.car_number} {pick.drivers?.driver_name}</div>
                    <div className="text-xs text-track-muted">{pick.drivers?.team_name}</div>
                  </div>
                  {pick.driver_id === team.captain_driver_id ? <span className="pill">C 2x</span> : pick.driver_id === team.vice_captain_driver_id ? <span className="pill">VC 1.5x</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-2xl font-black">Share options</h2>
          <p className="text-track-muted">Native share opens text message, Instagram DM, Messenger and other options on supported phones.</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn btn-primary" onClick={shareTeam}>Share team</button>
            <button className="btn" onClick={copyCaption}>Copy caption</button>
            <button className="btn" onClick={downloadSquare}>Download square card</button>
            <button className="btn" onClick={downloadStory}>Download story card</button>
          </div>

          <label className="text-sm font-bold text-track-muted">Caption
            <textarea className="textarea mt-2 min-h-[220px]" readOnly value={shareText} />
          </label>
        </div>
      </section>
    </div>
  );
}
