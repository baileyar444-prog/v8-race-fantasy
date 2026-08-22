export const canonicalAppUrl = "https://v8racefantasy.com";

export function appShareUrl(path = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${canonicalAppUrl}${cleanPath === "/" ? "" : cleanPath}`;
}
