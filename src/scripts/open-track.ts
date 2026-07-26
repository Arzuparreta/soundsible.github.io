import {
  decodeTrackCapsule,
  normalizedPlayerBase,
  playerTrackUrl,
} from "../lib/track-capsule";

const ASSOCIATION_KEY = "soundsible:player-base:v1";
const params = new URLSearchParams(window.location.hash.slice(1));

const view = (id: string): HTMLElement =>
  document.getElementById(id) as HTMLElement;
const show = (id: string): void => view(id).removeAttribute("hidden");
const hide = (id: string): void => view(id).setAttribute("hidden", "");

function storedPlayer(): string | null {
  try {
    return normalizedPlayerBase(localStorage.getItem(ASSOCIATION_KEY) || "");
  } catch {
    return null;
  }
}

function saveAndOpen(player: string, encoded: string): boolean {
  const target = playerTrackUrl(player, encoded);
  if (!target) return false;
  try {
    localStorage.setItem(ASSOCIATION_KEY, normalizedPlayerBase(player)!);
  } catch {
    // Storage can be unavailable in private modes; opening still works once.
  }
  window.location.replace(target);
  return true;
}

function registrationMode(rawPlayer: string): void {
  const player = normalizedPlayerBase(rawPlayer);
  if (!player) {
    show("invalid");
    return;
  }
  hide("loading");
  show("register");
  view("instance-host").textContent = new URL(player).host;
  view("register-button").addEventListener("click", () => {
    try {
      localStorage.setItem(ASSOCIATION_KEY, player);
    } catch {
      // Continue to the player even if this browser cannot remember the choice.
    }
    const rawReturn = params.get("return") || "";
    try {
      const target = new URL(rawReturn);
      const base = new URL(player);
      if (
        target.origin === base.origin &&
        target.pathname === base.pathname &&
        target.hash.startsWith("#/settings")
      ) {
        window.location.replace(target.href);
        return;
      }
    } catch {
      // A safe default is enough if an old client omitted its return URL.
    }
    window.location.replace(`${player}#/settings`);
  });
}

function trackMode(encoded: string): void {
  const capsule = decodeTrackCapsule(encoded);
  if (!capsule) {
    hide("loading");
    show("invalid");
    return;
  }

  const player = storedPlayer();
  if (player && saveAndOpen(player, encoded)) return;

  hide("loading");
  show("track");
  view("track-title").textContent = capsule.title;
  view("track-artist").textContent = capsule.artist;

  const desktop = view("open-desktop") as HTMLAnchorElement;
  desktop.href = `soundsible://track/${encoded}`;
  const youtube = view("open-youtube") as HTMLAnchorElement;
  youtube.href = `https://www.youtube.com/watch?v=${encodeURIComponent(capsule.yt)}`;

  const form = view("instance-form") as HTMLFormElement;
  const input = view("instance-url") as HTMLInputElement;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (saveAndOpen(input.value, encoded)) return;
    input.setAttribute("aria-invalid", "true");
    view("instance-error").removeAttribute("hidden");
  });
}

const registration = params.get("register");
const track = params.get("t");
if (registration) registrationMode(registration);
else if (track) trackMode(track);
else {
  hide("loading");
  show("invalid");
}
