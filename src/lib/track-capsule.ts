const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const ENCODED = /^[A-Za-z0-9_-]+$/;
const MAX_BYTES = 2048;
const MAX_TEXT = 256;

export interface TrackCapsule {
  v: 1;
  kind: "music";
  yt: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}

function validText(value: unknown, required = false): boolean {
  return (
    typeof value === "string" &&
    value.trim().length <= MAX_TEXT &&
    (!required || value.trim().length > 0)
  );
}

export function decodeTrackCapsule(encoded: string): TrackCapsule | null {
  if (!encoded || encoded.length > MAX_BYTES * 2 || !ENCODED.test(encoded)) return null;
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    if (bytes.byteLength > MAX_BYTES) return null;
    const value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as Record<string, unknown>;
    if (
      value.v !== 1 ||
      value.kind !== "music" ||
      typeof value.yt !== "string" ||
      !VIDEO_ID.test(value.yt) ||
      !validText(value.title, true) ||
      !validText(value.artist) ||
      (value.album !== undefined && !validText(value.album)) ||
      (value.duration !== undefined &&
        (typeof value.duration !== "number" ||
          !Number.isFinite(value.duration) ||
          value.duration < 0 ||
          value.duration > 86400)) ||
      !Object.keys(value).every((key) =>
        ["v", "kind", "yt", "title", "artist", "album", "duration"].includes(key),
      )
    ) {
      return null;
    }
    return value as unknown as TrackCapsule;
  } catch {
    return null;
  }
}

export function normalizedPlayerBase(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.search = "";
    if (!url.pathname.endsWith("/player/")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function playerTrackUrl(playerBase: string, encoded: string): string | null {
  const base = normalizedPlayerBase(playerBase);
  if (!base || !decodeTrackCapsule(encoded)) return null;
  return `${base}#/search?shared=${encodeURIComponent(encoded)}`;
}
