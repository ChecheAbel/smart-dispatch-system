/**
 * Base URL for Socket.IO (live tracking, driver trips).
 *
 * HTTP API calls can use NEXT_PUBLIC_API_URL=/ and rely on Next.js rewrites.
 * WebSocket upgrades are not proxied by those rewrites, so local dev must
 * connect directly to the API server unless NEXT_PUBLIC_REALTIME_URL is set.
 */
export function getRealtimeServerUrl() {
  const explicit = process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/\/+$/, "");
  if (explicit) {
    return explicit;
  }

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  if (/^https?:\/\//i.test(apiUrl)) {
    return apiUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4000";
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:4000";
}
