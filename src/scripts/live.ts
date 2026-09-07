import { liveText, listeners, breakLabel } from '../lib/live-i18n';
import { io, type Socket } from 'socket.io-client';
import { communityResourceLocation, discoverIceServers } from '../lib/whep';
import { directoryLink, roomLink, sessionFromSearch } from '../lib/live-link';

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
  emitted_at: number;
  transport: 'playing' | 'paused';
  /** Host clock at the moment the music stopped. Null while it is playing. */
  paused_since: number | null;
  primary: LiveDeck | null;
  secondary: LiveDeck | null;
  transition?: {
    technique: string;
    progress: number;
  } | null;
}

interface LiveSession {
  id: string;
  status: 'waiting' | 'live' | 'reconnecting';
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

const app = document.querySelector<HTMLElement>('#live-app');
const apiUrl = app?.dataset.communityUrl?.replace(/\/$/, '') ?? '';
const directory = document.querySelector<HTMLElement>('#directory-view')!;
const room = document.querySelector<HTMLElement>('#room-view')!;
const grid = document.querySelector<HTMLElement>('#session-grid')!;
const empty = document.querySelector<HTMLElement>('#empty-sessions')!;
const directoryError = document.querySelector<HTMLElement>('#directory-error')!;
const audio = document.querySelector<HTMLAudioElement>('#live-audio')!;
const listen = document.querySelector<HTMLButtonElement>('#listen-live')!;
const share = document.querySelector<HTMLButtonElement>('#share-room');
const listenError = document.querySelector<HTMLElement>('#listen-error')!;
const chatMessages = document.querySelector<HTMLElement>('#chat-messages')!;
const chatEmpty = document.querySelector<HTMLElement>('#chat-empty')!;
const chatForm = document.querySelector<HTMLFormElement>('#chat-form')!;
const chatInput = document.querySelector<HTMLInputElement>('#chat-input')!;

type AudioState = 'idle' | 'connecting' | 'connected' | 'blocked' | 'recovering' | 'failed';

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
const RECOVERY_WINDOW_MS = 90_000;

let sessions: LiveSession[] = [];
let active: LiveSession | null = null;
let program: LiveProgram | null = null;
let socket: Socket | null = null;
let peer: PeerHandle | null = null;
let statsTimer: number | undefined;
let programTimer: number | undefined;
let playoutDelayMs = 120;
let audioState: AudioState = 'idle';
let listening = false;
let listenGeneration = 0;
let retryAttempt = 0;
let retryTimer: number | undefined;
let recoveryDeadline = 0;
let breakTimer: number | undefined;
let breakBase = 0;
let breakArrived = 0;

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
  const art = node('span', 'live-cover');
  if (deck?.artwork_url) {
    const image = node('img');
    image.src = deck.artwork_url;
    image.alt = '';
    art.append(image);
  } else {
    art.textContent = '♪';
  }
  return art;
}

function trackRow(deck: LiveDeck): HTMLElement {
  const row = node('div', 'live-track');
  const copy = node('span', 'live-track-copy');
  copy.append(node('strong', undefined, deck.title), node('small', undefined, deck.artist));
  row.append(artwork(deck), copy);
  return row;
}

function card(session: LiveSession): HTMLButtonElement {
  const button = node('button', 'live-card');
  button.type = 'button';
  const head = node('div', 'live-card-head');
  const avatar = node('span', 'live-avatar', session.host.display_name.slice(0, 1).toUpperCase());
  if (session.host.avatar_color) avatar.style.background = session.host.avatar_color;
  const copy = node('span', 'live-card-copy');
  copy.append(
    node('strong', undefined, session.title),
    node('small', undefined, session.host.display_name),
  );
  const resting = session.status === 'live' && session.program?.transport === 'paused';
  const status = resting ? 'paused' : session.status;
  const state = node(
    'span',
    'live-state',
    liveText(
      status === 'live'
        ? 'Live'
        : status === 'paused'
          ? 'On a break'
          : status === 'waiting'
            ? 'Waiting'
            : 'Reconnecting',
    ),
  );
  state.dataset.status = status;
  head.append(avatar, copy, state);
  button.append(head);
  if (session.program?.primary) {
    button.append(trackRow(session.program.primary));
    if (session.program.secondary) {
      const progress = node('div', 'live-progress');
      const fill = node('span');
      fill.style.width = `${Math.round((session.program.transition?.progress ?? 0) * 100)}%`;
      progress.append(fill);
      button.append(progress, trackRow(session.program.secondary));
    }
  } else {
    button.append(node('p', 'live-waiting', liveText('About to start')));
  }
  button.append(node('footer', undefined, listeners(session.listener_count)));
  button.addEventListener('click', () => enter(session));
  return button;
}

function renderDirectory(): void {
  grid.replaceChildren(...sessions.map(card));
  empty.hidden = sessions.length > 0;
  const heading = document.querySelector<HTMLElement>('#directory-heading');
  if (heading) heading.textContent = liveText('Live now');
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
  const key = 'soundsible:live-guest:v1';
  let id = '';
  try {
    id = localStorage.getItem(key) ?? '';
  } catch {
    // Storage is optional.
  }
  if (!id) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
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

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Seconds of dead air, or null while the music plays.
 *
 * The break is measured against the host's own clock inside the payload and
 * advanced locally from there, so a listener whose clock disagrees still counts
 * the same break rather than an offset one.
 */
function breakSeconds(): number | null {
  if (program?.transport !== 'paused' || program.paused_since == null) return null;
  return breakBase + Math.round((Date.now() - breakArrived) / 1000);
}

/** Adopt a program payload and keep the break counter in step with it. */
function adoptProgram(next: LiveProgram | null): void {
  program = next;
  const since = next?.transport === 'paused' ? next.paused_since : null;
  if (next && since != null) {
    breakBase = Math.max(0, Math.round((next.emitted_at - since) / 1000));
    breakArrived = Date.now();
    if (breakTimer === undefined) breakTimer = window.setInterval(renderBreak, 1000);
    return;
  }
  window.clearInterval(breakTimer);
  breakTimer = undefined;
}

function renderBreak(): void {
  const resting = breakSeconds();
  if (resting === null) return;
  text('room-status', breakLabel(clock(resting)));
}

function renderProgram(): void {
  if (!active) return;
  const resting = breakSeconds();
  text(
    'room-status',
    liveText(
      resting !== null
        ? breakLabel(clock(resting))
        : active.status === 'live'
          ? 'Live'
          : active.status === 'reconnecting'
            ? 'Reconnecting'
            : 'Waiting',
    ),
  );
  text('room-title', program?.primary?.title ?? active.title);
  text(
    'room-artist',
    resting !== null
      ? liveText('The DJ paused the music.')
      : (program?.primary?.artist ?? liveText('About to start')),
  );
  const art = document.querySelector<HTMLElement>('#room-art')!;
  art.replaceChildren();
  if (program?.primary?.artwork_url) {
    const image = node('img');
    image.src = program.primary.artwork_url;
    image.alt = '';
    art.append(image);
  } else {
    art.append(node('span', undefined, '♪'));
  }
  const transition = document.querySelector<HTMLElement>('#transition')!;
  transition.hidden = !program?.secondary;
  if (program?.secondary) {
    text(
      'transition-technique',
      liveText(program.transition?.technique?.replaceAll('_', ' ') ?? 'blend'),
    );
    text('secondary-title', program.secondary.title);
    const progress = document.querySelector<HTMLElement>('#transition-progress')!;
    progress.style.width = `${Math.round((program.transition?.progress ?? 0) * 100)}%`;
  }
  renderListen();
}

/** The button is the audio state: the room status above it belongs to the
 * session, and the two drift apart whenever a listener reconnects alone. */
function renderListen(): void {
  if (audioState === 'idle') {
    const ready = Boolean(program?.primary);
    listen.disabled = !ready;
    listen.textContent = liveText(ready ? 'Listen live' : 'About to start');
    listenError.hidden = true;
    return;
  }
  listen.disabled = audioState === 'connecting' || audioState === 'recovering';
  listen.textContent = liveText(
    audioState === 'connected'
      ? 'Listening live'
      : audioState === 'connecting'
        ? 'Connecting…'
        : audioState === 'blocked'
          ? 'Tap to play'
          : audioState === 'recovering'
            ? 'Reconnecting…'
            : 'Try again',
  );
  listenError.hidden = audioState === 'connecting' || audioState === 'connected';
  listenError.textContent = liveText(
    audioState === 'recovering'
      ? 'The live audio dropped. Reconnecting…'
      : audioState === 'blocked'
        ? 'Your browser blocked playback. Tap to start the audio.'
        : 'The live audio could not be connected.',
  );
}

function setAudioState(next: AudioState): void {
  audioState = next;
  renderListen();
}

function receiveProgram(next: LiveProgram): void {
  if ((program?.seq ?? -1) >= next.seq) return;
  if (!peer) {
    adoptProgram(next);
    renderProgram();
    return;
  }
  window.clearTimeout(programTimer);
  programTimer = window.setTimeout(() => {
    adoptProgram(next);
    renderProgram();
  }, playoutDelayMs);
}

function updateSession(next: LiveSession): void {
  sessions = sessions.map((session) => (session.id === next.id ? next : session));
  if (active?.id === next.id) {
    active = next;
    if (next.program) adoptProgram(next.program);
    text('listener-count', listeners(next.listener_count));
    renderProgram();
  }
}

function addMessage(message: {
  sender: { display_name: string; avatar_color?: string | null };
  text: string;
}): void {
  chatEmpty.hidden = true;
  const line = node('p', 'chat-message');
  const name = node('strong', undefined, message.sender.display_name);
  if (message.sender.avatar_color) name.style.color = message.sender.avatar_color;
  line.append(name, node('span', undefined, message.text));
  chatMessages.append(line);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function connect(session: LiveSession): void {
  socket?.disconnect();
  const identity = guest();
  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    auth: {
      session_id: session.id,
      guest_id: identity.id,
      guest_name: identity.name,
    },
  });
  socket.on('session_snapshot', ({ session: next }: { session: LiveSession }) =>
    updateSession(next),
  );
  socket.on('session_updated', ({ session: next }: { session: LiveSession }) =>
    updateSession(next),
  );
  socket.on('program_event', (next: LiveProgram) => {
    receiveProgram(next);
  });
  socket.on('presence', ({ listener_count }: { listener_count: number }) => {
    if (!active) return;
    active = { ...active, listener_count };
    text('listener-count', listeners(listener_count));
  });
  socket.on('chat_message', addMessage);
  socket.on('session_ended', () => leave());
}

function clearRetry(): void {
  window.clearTimeout(retryTimer);
  retryTimer = undefined;
}

function releasePeer(handle: PeerHandle | null): void {
  if (!handle) return;
  handle.pc.close();
  if (handle.resourceUrl) void fetch(handle.resourceUrl, { method: 'DELETE' }).catch(() => {});
}

function closePeer(): void {
  clearRetry();
  window.clearInterval(statsTimer);
  window.clearTimeout(programTimer);
  releasePeer(peer);
  peer = null;
  audio.srcObject = null;
}

function requestedSessionId(): string | null {
  return sessionFromSearch(window.location.search);
}

/** Keep the address bar on the room, so the link a DJ shares lands on it. */
function pushRoomUrl(id: string | null): void {
  const href = id ? roomLink(window.location.href, id) : directoryLink(window.location.href);
  if (href !== window.location.href) window.history.pushState({ session: id }, '', href);
}

async function openRequestedRoom(): Promise<void> {
  const id = requestedSessionId();
  if (!id || active?.id === id) return;
  const known = sessions.find((session) => session.id === id);
  if (known) {
    enter(known, false);
    return;
  }
  try {
    const response = await fetch(`${apiUrl}/v1/sessions/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(String(response.status));
    enter((await response.json()).session as LiveSession, false);
  } catch {
    // The room ended before the link was opened; do not keep a dead address.
    pushRoomUrl(null);
  }
}

function enter(session: LiveSession, push = true): void {
  if (push) pushRoomUrl(session.id);
  listenGeneration += 1;
  listening = false;
  closePeer();
  audioState = 'idle';
  active = session;
  adoptProgram(session.program ?? null);
  directory.hidden = true;
  room.hidden = false;
  text('room-host', session.host.display_name);
  text('chat-title', session.title);
  text('listener-count', listeners(session.listener_count));
  chatMessages.querySelectorAll('.chat-message').forEach((message) => message.remove());
  chatEmpty.hidden = false;
  renderProgram();
  connect(session);
}

function leave(push = true): void {
  if (push) pushRoomUrl(null);
  listenGeneration += 1;
  listening = false;
  closePeer();
  audioState = 'idle';
  socket?.disconnect();
  socket = null;
  active = null;
  adoptProgram(null);
  room.hidden = true;
  directory.hidden = false;
  void refresh();
}

function waitIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const changed = () => {
      if (pc.iceGatheringState !== 'complete') return;
      pc.removeEventListener('icegatheringstatechange', changed);
      resolve();
    };
    pc.addEventListener('icegatheringstatechange', changed);
    window.setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', changed);
      resolve();
    }, 2500);
  });
}

function startStats(pc: RTCPeerConnection): void {
  window.clearInterval(statsTimer);
  statsTimer = window.setInterval(() => {
    void pc
      .getStats()
      .then((report) => {
        report.forEach((stat) => {
          if (stat.type !== 'inbound-rtp' || stat.kind !== 'audio') return;
          if (
            typeof stat.estimatedPlayoutTimestamp === 'number' &&
            typeof stat.timestamp === 'number'
          ) {
            const estimate = stat.estimatedPlayoutTimestamp - stat.timestamp;
            if (estimate >= 0 && estimate < 2000) playoutDelayMs = estimate;
          } else if (stat.jitterBufferEmittedCount > 0) {
            const estimate = (stat.jitterBufferDelay / stat.jitterBufferEmittedCount) * 1000;
            if (Number.isFinite(estimate))
              playoutDelayMs = Math.min(1000, Math.max(20, estimate + 20));
          }
        });
      })
      .catch(() => {});
  }, 1000);
}

async function establishPeer(generation: number): Promise<void> {
  const session = active;
  if (!session || generation !== listenGeneration) return;
  setAudioState(retryAttempt > 0 ? 'recovering' : 'connecting');
  const iceServers = await discoverIceServers(session.whep_url);
  const pc = new RTCPeerConnection({ iceServers });
  const stream = new MediaStream();
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.addEventListener('track', (event) => {
    for (const track of event.streams[0]?.getTracks() ?? [event.track]) stream.addTrack(track);
    audio.srcObject = stream;
  });

  let response: Response;
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIce(pc);
    response = await fetch(session.whep_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription?.sdp,
    });
    if (!response.ok) throw new Error(`whep_${response.status}`);
    await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
  } catch (error) {
    pc.close();
    throw error;
  }
  if (generation !== listenGeneration) {
    pc.close();
    return;
  }

  peer = { pc, resourceUrl: communityResourceLocation(session.whep_url, response) };
  pc.addEventListener('connectionstatechange', () => {
    if (generation !== listenGeneration || peer?.pc !== pc) return;
    if (pc.connectionState === 'connected') {
      retryAttempt = 0;
      if (audioState !== 'blocked') setAudioState('connected');
      return;
    }
    if (
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed' ||
      pc.connectionState === 'disconnected'
    ) {
      peer = null;
      if (pc.connectionState !== 'disconnected') pc.close();
      scheduleRecovery(generation);
    }
  });
  startStats(pc);
  try {
    await audio.play();
  } catch {
    // A connected peer that cannot sound is still a failure the page must own.
    setAudioState('blocked');
    return;
  }
  if (pc.connectionState === 'connected') {
    retryAttempt = 0;
    setAudioState('connected');
  }
}

/**
 * Rebuild a dropped listener rather than leaving a silent page behind.
 *
 * The window matches the host's own reconnect grace: past it, a room that
 * never came back is a room that ended.
 */
function scheduleRecovery(generation: number): void {
  if (generation !== listenGeneration || retryTimer !== undefined || !listening || !active) return;
  if (retryAttempt === 0 && audioState === 'connected') {
    recoveryDeadline = Date.now() + RECOVERY_WINDOW_MS;
  }
  if (Date.now() >= recoveryDeadline) {
    setAudioState('failed');
    return;
  }
  setAudioState('recovering');
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined;
    if (generation !== listenGeneration || !listening) return;
    const previous = peer;
    peer = null;
    releasePeer(previous);
    window.clearInterval(statsTimer);
    audio.srcObject = null;
    void establishPeer(generation).catch(() => scheduleRecovery(generation));
  }, delay);
}

async function startListening(): Promise<void> {
  if (!active) return;
  if (peer && audioState !== 'failed') return;
  listening = true;
  listenGeneration += 1;
  const generation = listenGeneration;
  recoveryDeadline = Date.now() + RECOVERY_WINDOW_MS;
  retryAttempt = 0;
  closePeer();
  try {
    await establishPeer(generation);
  } catch {
    scheduleRecovery(generation);
  }
}

document.querySelector('#refresh-sessions')?.addEventListener('click', () => void refresh());
document.querySelector('#leave-room')?.addEventListener('click', () => leave());
if (share) {
  const button = share;
  button.addEventListener('click', () => {
    if (!active) return;
    const link = roomLink(window.location.href, active.id);
    void navigator.clipboard
      ?.writeText(link)
      .then(() => {
        button.textContent = liveText('Link copied');
        window.setTimeout(() => {
          button.textContent = liveText('Share');
        }, 2000);
      })
      .catch(() => {
        // Clipboard access is not granted everywhere; offer the link by hand.
        window.prompt(liveText('Copy this link'), link);
      });
  });
}
listen.addEventListener('click', () => {
  if (audioState === 'blocked') {
    void audio
      .play()
      .then(() => setAudioState('connected'))
      .catch(() => {});
    return;
  }
  void startListening();
});
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value || !socket?.connected) return;
  socket.emit('chat_message', { text: value });
  chatInput.value = '';
});

void refresh().then(openRequestedRoom);
window.addEventListener('popstate', () => {
  if (!requestedSessionId()) {
    if (active) leave(false);
    return;
  }
  void openRequestedRoom();
});
window.setInterval(() => {
  if (!active) void refresh();
}, 10_000);

// Re-render labels in place; changing language must not replace audio or sockets.
document.addEventListener('site:locale', () => {
  renderDirectory();
  renderProgram();
  renderListen();
  if (active) text('listener-count', listeners(active.listener_count));
});
