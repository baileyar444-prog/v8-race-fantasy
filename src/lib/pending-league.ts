export const pendingLeagueJoinKey = "v8rf_pending_league_join";

export function normaliseLeagueCode(code: string | null | undefined) {
  return (code ?? "").trim().toUpperCase();
}

export function storePendingLeagueJoin(code: string | null | undefined) {
  if (typeof window === "undefined") return;
  const normalised = normaliseLeagueCode(code);
  if (!normalised) return;
  window.localStorage.setItem(pendingLeagueJoinKey, normalised);
}

export function readPendingLeagueJoin() {
  if (typeof window === "undefined") return "";
  return normaliseLeagueCode(window.localStorage.getItem(pendingLeagueJoinKey));
}

export function clearPendingLeagueJoin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(pendingLeagueJoinKey);
}

export function pendingLeagueRedirect(defaultPath = "/onboarding") {
  const code = readPendingLeagueJoin();
  return code ? `/leagues?join=${encodeURIComponent(code)}` : defaultPath;
}
