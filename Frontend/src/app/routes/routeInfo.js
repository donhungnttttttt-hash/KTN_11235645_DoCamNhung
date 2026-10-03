export function routeInfo(route = "/dashboard") {
  const index = route.indexOf("?");
  const path = index < 0 ? route : route.slice(0, index);
  const params = new URLSearchParams(index < 0 ? "" : route.slice(index + 1));
  const runner = /^\/tests\/(?:cycles\/)?([^/]+)$/.exec(path);
  return { path, params, specId: runner?.[1] ?? null, caseId: params.get("caseId") };
}

