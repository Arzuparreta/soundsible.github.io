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

  it("keeps the capsule in the recipient URL fragment", () => {
    const encoded = encode(capsule);
    expect(playerTrackUrl("https://music.example/player/", encoded)).toBe(
      `https://music.example/player/#/search?shared=${encoded}`,
    );
  });
});
