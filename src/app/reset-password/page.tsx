"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function updatePassword() {
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (password !== confirmPassword) throw new Error("The two passwords do not match.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage("Password updated. You can now log in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Account" title="Reset password">
        Enter a new password after opening the reset link from your email.
      </PageHeader>

      <section className="card space-y-4">
        <input
          className="input"
          placeholder="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <input
          className="input"
          placeholder="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {errorMessage ? <div className="error">{errorMessage}</div> : null}
        {message ? <div className="success">{message}</div> : null}

        <button className="btn btn-primary w-full" disabled={busy} onClick={updatePassword}>
          {busy ? "Updating password..." : "Update password"}
        </button>

        <Link className="btn w-full text-center" href="/login">Back to login</Link>
      </section>
    </div>
  );
}
