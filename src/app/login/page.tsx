"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { PageHeader } from "@/components/PageHeader";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [garageName, setGarageName] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createProfile(userId: string, userEmail: string) {
    const displayName = fullName.trim();
    const finalGarageName = garageName.trim() || `${displayName || "New"} Racing`;

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email: userEmail,
      display_name: displayName || userEmail,
      garage_name: finalGarageName,
      banner_colour: "#ff7a1a",
      shield_base_colour: "#ff7a1a",
      shield_pattern_colour: "#111827",
      shield_pattern: "chevron",
      shield_number: 88
    });

    if (error) throw error;
  }

  async function signUp() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!fullName.trim()) throw new Error("Please enter your full name.");
      if (!email.trim()) throw new Error("Please enter your email address.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            garage_name: garageName.trim()
          }
        }
      });

      if (error) throw error;

      if (!data.session || !data.user) {
        setErrorMessage(
          "Account created. Please check your inbox if email confirmation is required, then log in."
        );
        return;
      }

      await createProfile(data.user.id, data.user.email ?? email.trim());
      setMessage("Account created. Taking you to garage setup...");
      window.location.href = "/onboarding";
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong creating your account.");
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!email.trim()) throw new Error("Please enter your email address.");
      if (!password) throw new Error("Please enter your password.");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.full_name ?? data.user.email,
            garage_name: data.user.user_metadata?.garage_name ?? "New Garage",
            banner_colour: "#ff7a1a",
            shield_base_colour: "#ff7a1a",
            shield_pattern_colour: "#111827",
            shield_pattern: "chevron",
            shield_number: 88
          });
        }
      }

      window.location.href = "/onboarding";
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Account" title={mode === "signup" ? "Create your account" : "Log in"}>
        Create your account, then set your garage name, badge and V8 Race Fantasy team.
      </PageHeader>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/25 p-1">
          <button
            className={`rounded-xl px-4 py-3 font-black ${mode === "signup" ? "bg-track-orange text-black" : "text-track-muted"}`}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
          <button
            className={`rounded-xl px-4 py-3 font-black ${mode === "login" ? "bg-track-orange text-black" : "text-track-muted"}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
        </div>

        {mode === "signup" ? (
          <>
            <input className="input" placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <input className="input" placeholder="Garage / Team Name e.g. Thomas Performance Racing" value={garageName} onChange={(event) => setGarageName(event.target.value)} />
          </>
        ) : null}

        <input className="input" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />

        {errorMessage ? <div className="error">{errorMessage}</div> : null}
        {message ? <div className="success">{message}</div> : null}

        {mode === "signup" ? (
          <button className="btn btn-primary w-full" disabled={busy} onClick={signUp}>
            {busy ? "Creating account..." : "Create account and setup garage"}
          </button>
        ) : (
          <button className="btn btn-primary w-full" disabled={busy} onClick={signIn}>
            {busy ? "Logging in..." : "Log in"}
          </button>
        )}

      </div>
    </div>
  );
}
