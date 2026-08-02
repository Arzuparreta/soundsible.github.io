import { describe, expect, it } from "vitest";
import { directoryLink, roomLink, sessionFromSearch } from "./live-link";

const hub = "https://arzuparreta.github.io/soundsible.github.io/live/";

describe("sessionFromSearch", () => {
  it("reads the room a shared link names", () => {
    expect(sessionFromSearch("?session=abc123")).toBe("abc123");
    expect(sessionFromSearch("?utm=x&session=abc123")).toBe("abc123");
  });

  it("treats a missing or empty room as the directory", () => {
    expect(sessionFromSearch("")).toBeNull();
    expect(sessionFromSearch("?utm=x")).toBeNull();
    expect(sessionFromSearch("?session=")).toBeNull();
  });
});

describe("roomLink", () => {
  it("points at the room and drops everything else", () => {
    expect(roomLink(`${hub}?utm=mail#anchor`, "abc123")).toBe(`${hub}?session=abc123`);
  });

  it("replaces the room a link already carried", () => {
    expect(roomLink(`${hub}?session=old`, "new")).toBe(`${hub}?session=new`);
  });

  it("keeps the hub's project base path", () => {
    expect(roomLink(hub, "abc123")).toContain("/soundsible.github.io/live/");
  });
});

describe("directoryLink", () => {
  it("gives the directory back without disturbing other params", () => {
    expect(directoryLink(`${hub}?session=abc123&utm=mail`)).toBe(`${hub}?utm=mail`);
    expect(directoryLink(`${hub}?session=abc123`)).toBe(hub);
  });
});
