"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  lockoutAt?: string | null;
  manualLock?: boolean | null;
  compact?: boolean;
};

function formatDuration(ms: number) {
  if (ms <= 0) return "Locked";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function isLocked(lockoutAt?: string | null, manualLock?: boolean | null, now = Date.now()) {
  if (manualLock) return true;
  if (!lockoutAt) return false;
  const lockoutTime = new Date(lockoutAt).getTime();
  if (!Number.isFinite(lockoutTime)) return false;
  return now >= lockoutTime;
}

export function LockoutCountdown({ lockoutAt, manualLock, compact = false }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const locked = isLocked(lockoutAt, manualLock, now);
  const label = useMemo(() => {
    if (manualLock) return "Manually locked";
    if (!lockoutAt) return "No lockout set";
    return formatDuration(new Date(lockoutAt).getTime() - now);
  }, [lockoutAt, manualLock, now]);

  if (compact) {
    return (
      <span className={`pill ${locked ? "border-red-400/30 bg-red-500/10 text-red-100" : ""}`}>
        {locked ? "Locked" : "Locks in"}: {label}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${locked ? "border-red-400/25 bg-red-500/10" : "border-track-orange/25 bg-track-orange/10"}`}>
      <div className="text-xs font-black uppercase tracking-[.22em] text-track-muted">Round lockout</div>
      <div className="mt-1 text-2xl font-black">{locked ? "Locked" : label}</div>
      <div className="mt-1 text-sm text-track-muted">
        {manualLock
          ? "Race Control has manually locked this round."
          : lockoutAt
            ? `Lockout time: ${new Date(lockoutAt).toLocaleString()}`
            : "Set a lockout in Race Control."}
      </div>
    </div>
  );
}
