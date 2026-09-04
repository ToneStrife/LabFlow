/** Build HashRouter-compatible redirect URLs for Supabase Auth emails. */
export function buildAuthRedirectTo(hashPath: string): string {
  const origin = window.location.origin;
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  const basePath =
    firstSegment && firstSegment.toLowerCase() === "labflow"
      ? `/${firstSegment}`
      : "";
  const normalized = hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
  return `${origin}${basePath}/#${normalized}`;
}
