/**
 * WHEP transport helpers shared with the Soundsible player.
 *
 * The player owns the canonical implementation in
 * `ui_web/src/lib/communityWebrtc.ts`; this is the listener-only subset the
 * public hub needs. Keep the two in step when the relay changes.
 */

function unquote(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

/** Parse RFC 9725 Link values without letting one malformed entry discard the
 * usable ICE servers that follow it. */
export function parseIceServerLinks(value: string | null): RTCIceServer[] {
  if (!value) return [];
  const servers: RTCIceServer[] = [];
  for (const entry of value.split(/,\s*(?=<)/)) {
    const target = /^\s*<([^>]+)>/.exec(entry)?.[1];
    if (!target || !/^(?:stun|stuns|turn|turns):/i.test(target)) continue;
    const params = new Map<string, string>();
    const pattern = /;\s*([\w-]+)\s*=\s*(?:"((?:\\.|[^"])*)"|([^;,\s]+))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(entry)) !== null) {
      params.set(match[1].toLowerCase(), match[2] === undefined ? match[3] : unquote(match[2]));
    }
    if (!(params.get("rel") ?? "").split(/\s+/).includes("ice-server")) continue;
    const server: RTCIceServer = { urls: [target] };
    const username = params.get("username");
    const credential = params.get("credential");
    if (username !== undefined && credential !== undefined) {
      server.username = username;
      server.credential = credential;
    }
    servers.push(server);
  }
  return servers;
}

/**
 * Resolve the WHEP resource URL from a Location header.
 *
 * The relay's nginx strips the `/media` prefix before MediaMTX sees the
 * request, so a root-relative Location comes back without it. Sending the
 * teardown DELETE to the unprefixed path 404s and leaves the reader alive
 * until MediaMTX times it out.
 */
export function communityResourceLocation(endpoint: string, response: Response): string | undefined {
  const value = response.headers.get("Location");
  if (!value) return undefined;
  const endpointUrl = new URL(endpoint);
  if (value.startsWith("/") && endpointUrl.pathname.startsWith("/media/")) {
    return new URL(`/media${value}`, endpointUrl.origin).href;
  }
  return new URL(value, endpoint).href;
}

/** Ask the relay which STUN/TURN servers to use. Without these the browser
 * only offers host candidates, which fails on any network that blocks UDP. */
export async function discoverIceServers(endpoint: string): Promise<RTCIceServer[]> {
  const response = await fetch(endpoint, { method: "OPTIONS" });
  if (!response.ok) throw new Error(`ice_servers_${response.status}`);
  return parseIceServerLinks(response.headers.get("Link"));
}
