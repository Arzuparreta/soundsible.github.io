import { describe, expect, it } from "vitest";
import {
  decodeTrackCapsule,
  normalizedPlayerBase,
  playerTrackUrl,
} from "./track-capsule";

function encode(value: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const capsule = {
  v: 1,
  kind: "music",
  yt: "dQw4w9WgXcQ",
  title: "Canción",
  artist: "Björk",
};

describe("share bridge capsule", () => {
  it("decodes the app codec vector", () => {
    expect(decodeTrackCapsule(encode(capsule))).toEqual(capsule);
  });

  it("rejects identity changes and extra data", () => {
    expect(decodeTrackCapsule(encode({ ...capsule, yt: "short" }))).toBeNull();
    expect(decodeTrackCapsule(encode({ ...capsule, sender: "private" }))).toBeNull();
  });

  it("only accepts explicit Soundsible player roots", () => {
    expect(normalizedPlayerBase("https://music.example/player/")).toBe(
      "https://music.example/player/",
    );
    expect(normalizedPlayerBase("javascript:alert(1)")).toBeNull();
    expect(normalizedPlayerBase("https://music.example/admin/")).toBeNull();
  });

  // What people actually paste: the URL bar of their own player, in whatever
  // shape it was in. Every one of these names the same player.
  it("accepts the addresses a self-hosted player is reached by", () => {
    const base = "http://192.168.1.20:5005/player/";
    expect(normalizedPlayerBase("192.168.1.20:5005/player/")).toBe(base);
    expect(normalizedPlayerBase("http://192.168.1.20:5005/player")).toBe(base);
    expect(normalizedPlayerBase("http://192.168.1.20:5005")).toBe(base);
    expect(normalizedPlayerBase("http://192.168.1.20:5005/player/#/library")).toBe(base);
    expect(normalizedPlayerBase("http://192.168.1.20:5005/player/desktop/")).toBe(base);
    expect(normalizedPlayerBase("  http://192.168.1.20:5005/player/  ")).toBe(base);
  });

  it("still refuses anything that is not a player", () => {
    expect(normalizedPlayerBase("")).toBeNull();
    expect(normalizedPlayerBase("   ")).toBeNull();
    expect(normalizedPlayerBase("file:///etc/passwd")).toBeNull();
    expect(normalizedPlayerBase("https://music.example/playerish/")).toBeNull();
    expect(normalizedPlayerBase("https://music.example/admin/panel")).toBeNull();
  });

  it("opens a forgiving address on the player it names", () => {
    const encoded = encode(capsule);
    expect(playerTrackUrl("192.168.1.20:5005", encoded)).toBe(
      `http://192.168.1.20:5005/player/#/search?shared=${encoded}`,
    );
  });

  it("keeps the capsule in the recipient URL fragment", () => {
    const encoded = encode(capsule);
    expect(playerTrackUrl("https://music.example/player/", encoded)).toBe(
      `https://music.example/player/#/search?shared=${encoded}`,
    );
  });
});
