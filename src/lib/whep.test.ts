import { describe, expect, it } from "vitest";
import { communityResourceLocation, parseIceServerLinks } from "./whep";

function located(value: string | null): Response {
  return new Response(null, {
    status: 201,
    headers: value === null ? {} : { Location: value },
  });
}

describe("parseIceServerLinks", () => {
  it("reads the relay's TURN credentials", () => {
    const header =
      '<turns:turn.example.org:443>; rel="ice-server"; username="u"; credential="c"; '
      + 'credential-type="password", <stun:live.example.org:443>; rel="ice-server"';
    expect(parseIceServerLinks(header)).toEqual([
      { urls: ["turns:turn.example.org:443"], username: "u", credential: "c" },
      { urls: ["stun:live.example.org:443"] },
    ]);
  });

  it("keeps the usable servers when one entry is malformed", () => {
    const header =
      '<not-a-uri>; rel="ice-server", <https://example.org>; rel="ice-server", '
      + '<turn:live.example.org:3478?transport=tcp>; rel="ice-server"; username="u"; credential="c"';
    expect(parseIceServerLinks(header)).toEqual([
      { urls: ["turn:live.example.org:3478?transport=tcp"], username: "u", credential: "c" },
    ]);
  });

  it("ignores links that are not ice-server relations", () => {
    expect(parseIceServerLinks('<stun:live.example.org:443>; rel="describedby"')).toEqual([]);
    expect(parseIceServerLinks(null)).toEqual([]);
    expect(parseIceServerLinks("")).toEqual([]);
  });

  it("unescapes quoted credentials", () => {
    const header = '<turn:live.example.org:3478>; rel="ice-server"; username="a\\"b"; credential="c\\\\d"';
    expect(parseIceServerLinks(header)[0]).toEqual({
      urls: ["turn:live.example.org:3478"],
      username: 'a"b',
      credential: "c\\d",
    });
  });
});

describe("communityResourceLocation", () => {
  const endpoint = "https://live.example.org/media/whep/live_abc/whep";

  it("restores the /media prefix nginx strips from root-relative locations", () => {
    expect(communityResourceLocation(endpoint, located("/whep/live_abc/whep/session/1")))
      .toBe("https://live.example.org/media/whep/live_abc/whep/session/1");
  });

  it("leaves absolute locations alone", () => {
    expect(communityResourceLocation(endpoint, located("https://live.example.org/media/x")))
      .toBe("https://live.example.org/media/x");
  });

  it("resolves relative locations against the endpoint", () => {
    expect(communityResourceLocation(endpoint, located("session/1")))
      .toBe("https://live.example.org/media/whep/live_abc/session/1");
  });

  it("returns nothing when the relay sends no location", () => {
    expect(communityResourceLocation(endpoint, located(null))).toBeUndefined();
  });
});
