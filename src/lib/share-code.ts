export function makeShareCode(name: string) {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);

  const suffix = Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 6).toUpperCase();

  return `${cleaned || "V8"}${suffix}`;
}
