"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";

const CONTACT_EMAIL = "makesupercarsv8again@gmail.com";

type RoleState = "loading" | "logged-out" | "not-admin" | "admin";

type MemberProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  garage_name: string | null;
  created_at: string | null;
};

function csvEscape(value: string | null | undefined) {
  const text = value ?? "";
  return `"${text.replace(/"/g, '""')}"`;
}

function exactTimestamp(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short"
  }).format(new Date(value));
}

export default function MemberEmailsPage() {
  const supabase = createClient();
  const [roleState, setRoleState] = useState<RoleState>("loading");
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      setErrorMessage("");
      setMessage("");

      try {
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          setRoleState("logged-out");
          return;
        }

        const { data: myProfile, error: roleError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (roleError) throw roleError;

        if (myProfile?.role !== "admin") {
          setRoleState("not-admin");
          return;
        }

        setRoleState("admin");

        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,display_name,garage_name,created_at")
          .not("email", "is", null)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProfiles((data ?? []) as MemberProfile[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load member emails.");
      }
    }

    load();
  }, [supabase]);

  const emails = useMemo(() => {
    return [...new Set(profiles.map((profile) => profile.email?.trim()).filter(Boolean) as string[])].sort();
  }, [profiles]);

  const bccList = emails.join(", ");
  const csvText = useMemo(() => {
    const rows = ["email,display_name,garage_name,signup_timestamp_iso,signup_timestamp_display"];
    for (const profile of profiles) {
      if (!profile.email) continue;
      rows.push([
        csvEscape(profile.email),
        csvEscape(profile.display_name),
        csvEscape(profile.garage_name),
        csvEscape(profile.created_at),
        csvEscape(exactTimestamp(profile.created_at))
      ].join(","));
    }
    return rows.join("\n");
  }, [profiles]);

  async function copyEmails() {
    await navigator.clipboard.writeText(bccList);
    setMessage(`Copied ${emails.length} email address${emails.length === 1 ? "" : "es"}.`);
  }

  async function copyCsv() {
    await navigator.clipboard.writeText(csvText);
    setMessage("Copied CSV to clipboard.");
  }

  function downloadCsv() {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "v8-race-fantasy-members.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Downloaded member email CSV.");
  }

  if (roleState === "loading") return <div className="card">Loading member emails...</div>;

  if (roleState === "logged-out") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Member emails">Log in as the admin account to access this page.</PageHeader>
      </div>
    );
  }

  if (roleState === "not-admin") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin only" title="Member emails">This page is only visible to the creator/admin account.</PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Member emails">
        Export sign-up emails for V8 Race Fantasy updates. Use BCC or import the CSV into an email platform.
      </PageHeader>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="error">{errorMessage}</div> : null}

      <section className="card border-track-orange/25 bg-track-orange/10">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="pill mb-3">Official sender/contact</div>
            <h2 className="text-2xl font-black">{CONTACT_EMAIL}</h2>
            <p className="mt-2 text-track-muted">This is the public contact address now shown around the app.</p>
          </div>
          <a className="btn btn-primary" href={`mailto:${CONTACT_EMAIL}`}>Open email</a>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card"><div className="text-sm font-black text-track-muted">Members with emails</div><div className="mt-2 text-4xl font-black">{emails.length}</div></div>
        <div className="card"><div className="text-sm font-black text-track-muted">Profiles loaded</div><div className="mt-2 text-4xl font-black">{profiles.length}</div></div>
        <div className="card"><div className="text-sm font-black text-track-muted">Recommended sending</div><div className="mt-2 text-2xl font-black">BCC or CSV import</div></div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-black">Email tools</h2>
            <p className="text-sm text-track-muted">For a quick one-off update, copy the BCC list. For launches/newsletters, download CSV and use an email platform with unsubscribe support.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={copyEmails}>Copy BCC emails</button>
            <button className="btn" onClick={copyCsv}>Copy CSV</button>
            <button className="btn" onClick={downloadCsv}>Download CSV</button>
          </div>
        </div>

        <label className="text-sm font-bold text-track-muted">BCC email list
          <textarea
            className="textarea mt-2 min-h-[160px]"
            readOnly
            value={bccList}
          />
        </label>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 text-2xl font-black">Members</h2>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-track-muted">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Name</th>
              <th className="p-3">Garage</th>
              <th className="p-3">Exact signup timestamp</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-t border-white/10">
                <td className="p-3 font-bold">{profile.email}</td>
                <td className="p-3 text-track-muted">{profile.display_name ?? "—"}</td>
                <td className="p-3 text-track-muted">{profile.garage_name ?? "—"}</td>
                <td className="p-3 text-track-muted">{exactTimestamp(profile.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
