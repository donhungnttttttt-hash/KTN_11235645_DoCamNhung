// Preserve deterministic design aliases. Old test/cycle/file IDs stay intact so
// AppRouter can explain retirement; none of them is a Feature ID mapping.
export function normalizeRoute(route) {
  if (!route.startsWith("/design")) return route;
  const [path, query = ""] = route.split("?");
  const destination = path.startsWith("/design/issue/")
    ? path.replace("/design/issue/", "/board/issue/")
    : {
        "/design/home": "/dashboard",
        "/design/new": "/board/new",
        "/design/issues": "/board/list",
        "/design/board": "/board",
      }[path] || "/dashboard";
  return destination + (query ? `?${query}` : "");
}
