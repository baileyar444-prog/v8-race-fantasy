export type CurrentEventCandidate = {
  slug?: string | null;
  is_open_event?: boolean | null;
  lockout_at?: string | null;
  manual_lock?: boolean | null;
  sort_order?: number | null;
};

function lockTime(event: CurrentEventCandidate) {
  if (!event.lockout_at) return Number.POSITIVE_INFINITY;
  const value = new Date(event.lockout_at).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function isUsableNow(event: CurrentEventCandidate, now: number) {
  if (event.manual_lock) return false;
  const time = lockTime(event);
  return time === Number.POSITIVE_INFINITY || time > now;
}

/**
 * Select the event the public site should treat as current.
 *
 * Important: stale database flags can leave an old event marked open.
 * We therefore prefer an explicitly-open event only when it has not already
 * locked. If multiple valid events are marked open, the nearest lockout wins.
 * If no valid explicit event exists, use the nearest future unlocked event.
 */
export function selectCurrentEvent<T extends CurrentEventCandidate>(events: T[], now = Date.now()): T | null {
  const bySoonestLock = (a: T, b: T) => {
    const timeDiff = lockTime(a) - lockTime(b);
    if (timeDiff !== 0) return timeDiff;
    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  };

  const validOpen = events
    .filter((event) => Boolean(event.is_open_event) && isUsableNow(event, now))
    .sort(bySoonestLock);
  if (validOpen.length) return validOpen[0];

  const futureUnlocked = events
    .filter((event) => isUsableNow(event, now))
    .sort(bySoonestLock);
  if (futureUnlocked.length) return futureUnlocked[0];

  const explicitlyOpen = events
    .filter((event) => Boolean(event.is_open_event))
    .sort((a, b) => Number(b.sort_order ?? 0) - Number(a.sort_order ?? 0));
  if (explicitlyOpen.length) return explicitlyOpen[0];

  return null;
}
