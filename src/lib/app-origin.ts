const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function normalizeAppHostname(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "[::1]" ? "localhost" : hostname;
}

export function getAppOriginFromRequest(request: Request) {
  const url = new URL(request.url);
  url.hostname = normalizeAppHostname(url.hostname);
  return url.origin;
}

export function isLoopbackHostname(hostname: string) {
  return LOOPBACK_HOSTS.has(hostname);
}

export function shouldUseLocalhostForApp(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "[::1]";
}
