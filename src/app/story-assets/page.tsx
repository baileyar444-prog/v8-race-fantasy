"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  garage_name: string | null;
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

function makeStorySvg(title: string, subtitle: string, footer = "v8racefantasy.com") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff7a1a"/>
        <stop offset="36%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#070a10"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="990" cy="160" r="310" fill="#ff7a1a" opacity="0.18"/>
    <circle cx="20" cy="1750" r="360" fill="#ffb84d" opacity="0.12"/>
    <rect x="70" y="90" width="940" height="1740" rx="62" fill="rgba(7,10,16,0.72)" stroke="rgba(255,255,255,0.18)"/>
    <text x="110" y="210" fill="#ffb84d" font-size="34" font-family="Arial" font-weight="900" letter-spacing="6">V8 RACE FANTASY</text>
    <text x="110" y="640" fill="#ffffff" font-size="110" font-family="Arial" font-weight="900">${escapeXml(title)}</text>
    <text x="110" y="735" fill="#ffb84d" font-size="52" font-family="Arial" font-weight="900">${escapeXml(subtitle)}</text>
    <rect x="110" y="1050" width="860" height="150" rx="38" fill="#ff7a1a"/>
    <text x="540" y="1140" text-anchor="middle" fill="#100701" font-size="52" font-family="Arial" font-weight="900">${escapeXml(footer.toUpperCase())}</text>
    <text x="110" y="1580" fill="#a8b5c9" font-size="34" font-family="Arial" font-weight="800">FREE TO PLAY · COMMUNITY LEAGUE GRID88</text>
    <text x="110" y="1680" fill="#ffffff" font-size="44" font-family="Arial" font-weight="900">Build your garage. Beat your mates.</text>
  </svg>`;
}

function downloadStoryPng(filename: string, title: string, subtitle: string, footer = "v8racefantasy.com") {
  const svg = makeStorySvg(title, subtitle, footer);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;

    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      downloadBlob(filename.replace(".png", ".png"), svgBlob);
      return;
    }

    context.drawImage(image, 0, 0, 1080, 1920);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (blob) {
        downloadBlob(filename, blob);
      } else {
        downloadBlob(filename.replace(".png", ".png"), svgBlob);
      }
    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    downloadBlob(filename.replace(".png", ".png"), svgBlob);
  };

  image.src = url;
}

export default function StoryAssetsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();

      if (authData.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id,garage_name")
          .eq("id", authData.user.id)
          .maybeSingle();

        setProfile(profileData as Profile | null);
      }

      const { data: scoreData } = await supabase
        .from("fantasy_scores")
        .select("user_id,published_score");

      setScores((scoreData ?? []) as ScoreRow[]);
    }

    load();
  }, [supabase]);

  const rank = useMemo(() => {
    if (!profile?.id) return null;

    const totals: Record<string, number> = {};
    for (const score of scores) {
      totals[score.user_id] = (totals[score.user_id] ?? 0) + Number(score.published_score ?? 0);
    }

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const index = sorted.findIndex(([id]) => id === profile.id);
    return index >= 0 ? index + 1 : null;
  }, [profile?.id, scores]);

  const garage = profile?.garage_name ?? "My Garage";

  const assets = [
    {
      title: "I JOINED",
      subtitle: "V8 Race Fantasy",
      filename: "v8-race-fantasy-i-joined.png",
      button: "Download joined story"
    },
    {
      title: "TEAM LOCKED",
      subtitle: garage,
      filename: "v8-race-fantasy-team-locked.png",
      button: "Download team locked"
    },
    {
      title: "JOIN MY LEAGUE",
      subtitle: "Code GRID88",
      filename: "v8-race-fantasy-join-grid88.png",
      button: "Download league invite"
    },
    {
      title: rank ? `RANKED #${rank}` : "CLIMBING",
      subtitle: rank ? "Overall ladder" : "The ladder",
      filename: "v8-race-fantasy-rank-story.png",
      button: "Download rank story"
    }
  ];

  function handleDownload(asset: typeof assets[number]) {
    downloadStoryPng(asset.filename, asset.title, asset.subtitle);
    setMessage(`${asset.button.replace("Download ", "")} downloaded.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Instagram assets" title="Story assets">
        Download simple Instagram story cards to promote the app, your team or the community league.
      </PageHeader>

      {message ? <div className="success">{message}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {assets.map((asset) => (
          <div key={asset.filename} className="card">
            <div className="aspect-[9/16] rounded-3xl border border-white/10 bg-gradient-to-br from-track-orange/30 via-[#111827] to-black p-5">
              <div className="text-xs font-black uppercase tracking-[.22em] text-orange-100">V8 Race Fantasy</div>
              <div className="mt-24 text-4xl font-black">{asset.title}</div>
              <div className="mt-2 text-xl font-black text-orange-100">{asset.subtitle}</div>
              <div className="mt-14 rounded-2xl bg-track-orange p-3 text-center text-sm font-black text-black">v8racefantasy.com</div>
            </div>
            <button className="btn btn-primary mt-4 w-full" onClick={() => handleDownload(asset)}>{asset.button}</button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">Team-specific card</h2>
        <p className="mt-2 text-track-muted">Want a card with your six selected drivers and captaincy? Use the team card builder.</p>
        <Link className="btn btn-primary mt-4" href="/share-team">Open team card builder</Link>
      </section>
    </div>
  );
}
