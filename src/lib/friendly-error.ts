export const LIVE_DATA_CONNECTION_MESSAGE =
  "We couldn’t connect to V8 Race Fantasy’s live data. This can happen if your internet or network is blocking the data service. Try refreshing, switching Wi-Fi/mobile data, or trying again shortly.";

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

export function isLikelyConnectionError(error: unknown) {
  const message = errorText(error).toLowerCase();
  if (!message) return false;

  return [
    "failed to fetch",
    "fetch failed",
    "networkerror",
    "network error",
    "network request failed",
    "load failed",
    "connection refused",
    "connection reset",
    "err_network",
    "timeout",
    "timed out",
    "name not resolved"
  ].some((hint) => message.includes(hint));
}

export function friendlyDataError(error: unknown, fallback: string) {
  if (isLikelyConnectionError(error)) return LIVE_DATA_CONNECTION_MESSAGE;
  const message = errorText(error);
  return message || fallback;
}

export function friendlyAuthError(error: unknown, fallback: string) {
  if (isLikelyConnectionError(error)) return LIVE_DATA_CONNECTION_MESSAGE;

  const message = errorText(error);
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (lower.includes("email not confirmed")) return "Please confirm your email address before logging in.";
  if (lower.includes("user already registered")) return "An account already exists for this email. Try logging in instead.";

  return message || fallback;
}
