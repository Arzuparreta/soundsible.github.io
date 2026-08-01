import { io, type Socket } from "socket.io-client";

interface LiveDeck {
  id: string;
  title: string;
  artist: string;
  artwork_url?: string | null;
  position: number;
  duration: number;
  gain: number;
}

interface LiveProgram {
  seq: number;
  transport: "playing" | "paused";
  primary: LiveDeck | null;
  secondary: LiveDeck | null;
  transition?: {
    technique: string;
    progress: number;
  } | null;
}

interface LiveSession {
  id: string;
  status: "waiting" | "live" | "reconnecting";
  title: string;
  host: {
    id: string;
    display_name: string;
    avatar_color?: string | null;
  };
  listener_count: number;
  program?: LiveProgram | null;
  whep_url: string;
}

interface PeerHandle {
  pc: RTCPeerConnection;
  resourceUrl?: string;
}

const app = document.querySelector<HTMLElement>("#live-app");
const apiUrl = app?.dataset.communityUrl?.replace(/\/$/, "") ?? "";
const directory = document.querySelector<HTMLElement>("#directory-view")!;
const room = document.querySelector<HTMLElement>("#room-view")!;
const grid = document.querySelector<HTMLElement>("#session-grid")!;
const empty = document.querySelector<HTMLElement>("#empty-sessions")!;
const directoryError = document.querySelector<HTMLElement>("#directory-error")!;
const audio = document.querySelector<HTMLAudioElement>("#live-audio")!;
const listen = document.querySelector<HTMLButtonElement>("#listen-live")!;
const listenError = document.querySelector<HTMLElement>("#listen-error")!;
const chatMessages = document.querySelector<HTMLElement>("#chat-messages")!;
const chatEmpty = document.querySelector<HTMLElement>("#chat-empty")!;
const chatForm = document.querySelector<HTMLFormElement>("#chat-form")!;
const chatInput = document.querySelector<HTMLInputElement>("#chat-input")!;

let sessions: LiveSession[] = [];
let active: LiveSession | null = null;
let program: LiveProgram | null = null;
let socket: Socket | null = null;
let peer: PeerHandle | null = null;
let statsTimer: number | undefined;
let programTimer: number | undefined;
let playoutDelayMs = 120;

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function artwork(deck: LiveDeck | null | undefined): HTMLElement {
  const art = node("span", "live-cover");
  if (deck?.artwork_url) {
    const image = node("img");
    image.src = deck.artwork_url;
    image.alt = "";
    art.append(image);
  } else {
    art.textContent = "♪";
  }
  return art;
}

function trackRow(deck: LiveDeck): HTMLElement {
  const row = node("div", "live-track");
  const copy = node("span", "live-track-copy");
  copy.append(node("strong", undefined, deck.title), node("small", undefined, deck.artist));
  row.append(artwork(deck), copy);
  return row;
}

function card(session: LiveSession): HTMLButtonElement {
  const button = node("button", "live-card");
  button.type = "button";
  const head = node("div", "live-card-head");
  const avatar = node("span", "live-avatar", session.host.display_name.slice(0, 1).toUpperCase());
  if (session.host.avatar_color) avatar.style.background = session.host.avatar_color;
  const copy = node("span", "live-card-copy");
  copy.append(node("strong", undefined, session.title), node("small", undefined, session.host.display_name));
  const state = node("span", "live-state", session.status === "live" ? "Live" : session.status === "waiting" ? "Waiting" : "Reconnecting");
  state.dataset.status = session.status;
  head.append(avatar, copy, state);
  button.append(head);
  if (session.program?.primary) {
    button.append(trackRow(session.program.primary));
    if (session.program.secondary) {
      const progress = node("div", "live-progress");
      const fill = node("span");
      fill.style.width = `${Math.round((session.program.transition?.progress ?? 0) * 100)}%`;
      progress.append(fill);
      button.append(progress, trackRow(session.program.secondary));
    }
  } else {
    button.append(node("p", "live-waiting", "About to start"));
  }
  button.append(node("footer", undefined, `${session.listener_count} listeners`));
  button.addEventListener("click", () => enter(session));
  return button;
}

function renderDirectory(): void {
  grid.replaceChildren(...sessions.map(card));
  empty.hidden = sessions.length > 0;
}

async function refresh(): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/v1/sessions`);
    if (!response.ok) throw new Error(String(response.status));
    sessions = (await response.json()).sessions ?? [];
    directoryError.hidden = true;
    renderDirectory();
  } catch {
    directoryError.hidden = false;
  }
}

function guest(): { id: string; name: string } {
  const key = "soundsible:live-guest:v1";
  let id = "";
  try {
    id = localStorage.getItem(key) ?? "";
  } catch {
    // Storage is optional.
  }
  if (!id) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(key, id);
    } catch {
      // Storage is optional.
    }
  }
  return { id: `guest-${id}`, name: `Guest-${id.slice(-4).toUpperCase()}` };
}

function text(id: string, value: string): void {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element) element.textContent = value;
}

function renderProgram(): void {
  if (!active) return;
  text("room-status", active.status === "live" ? "Live" : active.status === "reconnecting" ? "Reconnecting" : "Waiting");
  text("room-title", program?.primary?.title ?? active.title);
  text("room-artist", program?.primary?.artist ?? "About to start");
  const art = document.querySelector<HTMLElement>("#room-art")!;
  art.replaceChildren();
  if (program?.primary?.artwork_url) {
    const image = node("img");
    image.src = program.primary.artwork_url;
    image.alt = "";
    art.append(image);
  } else {
    art.append(node("span", undefined, "♪"));
  }
  const transition = document.querySelector<HTMLElement>("#transition")!;
  transition.hidden = !program?.secondary;
  if (program?.secondary) {
    text("transition-technique", program.transition?.technique?.replaceAll("_", " ") ?? "blend");
    text("secondary-title", program.secondary.title);
    const progress = document.querySelector<HTMLElement>("#transition-progress")!;
    progress.style.width = `${Math.round((program.transition?.progress ?? 0) * 100)}%`;
  }
  if (!peer) {
    listen.disabled = !program?.primary;
    listen.textContent = program?.primary ? "Listen live" : "About to start";
  }
}

function receiveProgram(next: LiveProgram): void {
  if ((program?.seq ?? -1) >= next.seq) return;
  if (!peer) {
    program = next;
    renderProgram();
    return;
  }
  window.clearTimeout(programTimer);
  programTimer = window.setTimeout(() => {
    program = next;
    renderProgram();
  }, playoutDelayMs);
}

function updateSession(next: LiveSession): void {
  sessions = sessions.map((session) => session.id === next.id ? next : session);
  if (active?.id === next.id) {
    active = next;
    if (next.program) program = next.program;
    text("listener-count", `${next.listener_count} listeners`);
    renderProgram();
  }
}

function addMessage(message: {
  sender: { display_name: string; avatar_color?: string | null };
  text: string;
}): void {
  chatEmpty.hidden = true;
  const line = node("p", "chat-message");
  const name = node("strong", undefined, message.sender.display_name);
  if (message.sender.avatar_color) name.style.color = message.sender.avatar_color;
  line.append(name, node("span", undefined, message.text));
  chatMessages.append(line);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function connect(session: LiveSession): void {
  socket?.disconnect();
  const identity = guest();
  socket = io(apiUrl, {
    transports: ["websocket", "polling"],
    auth: {
      session_id: session.id,
      guest_id: identity.id,
      guest_name: identity.name,
    },
  });
  socket.on("session_snapshot", ({ session: next }: { session: LiveSession }) => updateSession(next));
  socket.on("session_updated", ({ session: next }: { session: LiveSession }) => updateSession(next));
  socket.on("program_event", (next: LiveProgram) => {
    receiveProgram(next);
  });
  socket.on("presence", ({ listener_count }: { listener_count: number }) => {
    if (!active) return;
    active = { ...active, listener_count };
    text("listener-count", `${listener_count} listeners`);
  });
  socket.on("chat_message", addMessage);
  socket.on("session_ended", leave);
}

function closePeer(): void {
  if (!peer) return;
  peer.pc.close();
  if (peer.resourceUrl) void fetch(peer.resourceUrl, { method: "DELETE" }).catch(() => {});
  peer = null;
  window.clearInterval(statsTimer);
  window.clearTimeout(programTimer);
  audio.srcObject = null;
}

function enter(session: LiveSession): void {
  active = session;
  program = session.program ?? null;
  directory.hidden = true;
  room.hidden = false;
  text("room-host", session.host.display_name);
  text("chat-title", session.title);
  text("listener-count", `${session.listener_count} listeners`);
  chatMessages.querySelectorAll(".chat-message").forEach((message) => message.remove());
  chatEmpty.hidden = false;
  listen.textContent = "Listen live";
  listenError.hidden = true;
  renderProgram();
  connect(session);
}

function leave(): void {
  closePeer();
  socket?.disconnect();
  socket = null;
  active = null;
  program = null;
  room.hidden = true;
  directory.hidden = false;
  void refresh();
}

function waitIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const changed = () => {
      if (pc.iceGatheringState !== "complete") return;
      pc.removeEventListener("icegatheringstatechange", changed);
      resolve();
    };
    pc.addEventListener("icegatheringstatechange", changed);
    window.setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", changed);
      resolve();
    }, 2500);
  });
}

async function startListening(): Promise<void> {
  if (!active || peer) return;
  listen.disabled = true;
  listen.textContent = "Connecting…";
  listenError.hidden = true;
  const pc = new RTCPeerConnection();
  const stream = new MediaStream();
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.addEventListener("track", (event) => {
    for (const track of event.streams[0]?.getTracks() ?? [event.track]) stream.addTrack(track);
    audio.srcObject = stream;
  });
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIce(pc);
    const response = await fetch(active.whep_url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: pc.localDescription?.sdp,
    });
    if (!response.ok) throw new Error(String(response.status));
    await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
    const location = response.headers.get("Location");
    peer = { pc, resourceUrl: location ? new URL(location, active.whep_url).href : undefined };
    window.clearInterval(statsTimer);
    statsTimer = window.setInterval(() => {
      void pc.getStats().then((report) => {
        report.forEach((stat) => {
          if (stat.type !== "inbound-rtp" || stat.kind !== "audio") return;
          if (typeof stat.estimatedPlayoutTimestamp === "number" && typeof stat.timestamp === "number") {
            const estimate = stat.estimatedPlayoutTimestamp - stat.timestamp;
            if (estimate >= 0 && estimate < 2000) playoutDelayMs = estimate;
          } else if (stat.jitterBufferEmittedCount > 0) {
            const estimate = (stat.jitterBufferDelay / stat.jitterBufferEmittedCount) * 1000;
            if (Number.isFinite(estimate)) playoutDelayMs = Math.min(1000, Math.max(20, estimate + 20));
          }
        });
      }).catch(() => {});
    }, 1000);
    await audio.play();
    listen.textContent = "Listening live";
  } catch {
    pc.close();
    listenError.hidden = false;
    listen.textContent = "Try again";
  } finally {
    listen.disabled = false;
  }
}

document.querySelector("#refresh-sessions")?.addEventListener("click", () => void refresh());
document.querySelector("#leave-room")?.addEventListener("click", leave);
listen.addEventListener("click", () => void startListening());
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value || !socket?.connected) return;
  socket.emit("chat_message", { text: value });
  chatInput.value = "";
});

void refresh();
window.setInterval(() => {
  if (!active) void refresh();
}, 10_000);
