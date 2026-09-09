import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const [owner, repository] = (
  process.env.GITHUB_REPOSITORY ?? 'Arzuparreta/soundsible.github.io'
).split('/');
const base = repository === `${owner}.github.io` ? '/' : `/${repository}/`;
const capsule = Buffer.from(
  JSON.stringify({
    v: 1,
    kind: 'music',
    yt: 'dQw4w9WgXcQ',
    title: 'Canción compartida',
    artist: 'Björk',
  }),
).toString('base64url');
for (const locale of ['en', 'es'])
  for (const theme of ['light', 'dark']) {
    test(`${locale} ${theme}: navigation, layout and accessibility`, async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem('soundsible:site-theme', value),
        theme,
      );
      for (const path of [
        '',
        'start/',
        'docs/',
        'docs/native-installation/',
        'docs/dj-mode/',
        'project/',
        'open/',
      ]) {
        await page.goto(base + (locale === 'es' ? 'es/' : '') + path);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('main')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(
          results.violations,
          `${path}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
        ).toEqual([]);
      }
    });
  }
test('language links retain article and section; theme persists', async ({ page }) => {
  await page.goto(base + 'docs/dj-mode/#start-a-set');
  await page.locator('[data-language-switch]').click();
  await expect(page).toHaveURL(new RegExp('/es/docs/dj-mode/#start-a-set$'));
  await expect(page.locator('#start-a-set')).toBeVisible();
  await page.selectOption('#theme-select', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
for (const locale of ['en', 'es'])
  test(`search uses ${locale} and links to actual articles`, async ({ page }) => {
    await page.goto(base + (locale === 'es' ? 'es/' : '') + 'docs/');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#search-dialog')).toBeVisible();
    const input = page.locator('#search input');
    await input.fill(locale === 'es' ? 'instalación' : 'installation');
    const result = page.locator('.pagefind-ui__result-link').first();
    await expect(result).toBeVisible();
    const target = await result.getAttribute('href');
    expect(target).toContain(base + (locale === 'es' ? 'es/' : '') + 'docs/');
    if (locale === 'en') expect(target).not.toContain('/es/');
    await result.click();
    await expect(page.locator('.prose')).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.locator('#search input').fill('zzzxxyyimpossible');
    await expect(page.locator('.pagefind-ui__message')).toContainText(
      locale === 'es' ? 'No hay resultados' : 'No results',
    );
  });
test('mobile menu, documentation and wide code at 200% equivalent reflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + 'es/');
  await page.locator('.menu-toggle').click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page
    .locator('#mobile-nav')
    .getByRole('link', { name: 'Documentación', exact: true })
    .click();
  await page.getByRole('link', { name: 'Configuración', exact: false }).first().click();
  await page.locator('.mobile-doc-nav summary').click();
  await expect(page.locator('.mobile-doc-nav nav')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.mobile-doc-nav summary').click();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
});
test('OS tabs work with the keyboard and copy the release-pinned commands', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(base + 'es/start/');
  await page.locator('.quick-commands summary').click();
  await page.locator('#os-tab-0').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#os-tab-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#os-panel-1')).toBeVisible();
  await page.locator('#os-panel-1 .copy-button').click();
  const code = await page.evaluate(() => navigator.clipboard.readText());
  expect(code).toContain('git clone --branch v');
  expect(code).toContain('brew install');
  expect(code).not.toContain('Copiar');
});
test('shared songs keep their fragment when switching language and reject invalid addresses', async ({
  page,
}) => {
  await page.goto(base + 'open/#t=' + capsule);
  await expect(page.locator('#track-title')).toHaveText('Canción compartida');
  await page.locator('[data-language-switch]').click();
  await expect(page).toHaveURL(base + 'es/open/#t=' + capsule);
  await expect(page.locator('#track-title')).toHaveText('Canción compartida');
  await page.locator('#instance-url').fill('javascript:alert(1)');
  await page.locator('#instance-form button').click();
  await expect(page.locator('#instance-error')).toBeVisible();
  await expect(page.locator('#instance-url')).toHaveAttribute('aria-invalid', 'true');
});
test('invalid registration hides loading and does not save an address', async ({ page }) => {
  await page.goto(base + 'es/open/#register=javascript%3Aalert(1)');
  await expect(page.locator('#invalid')).toBeVisible();
  await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('soundsible:player-base:v1'))).toBeNull();
});
test('Live empty and service-error states are localized', async ({ page }) => {
  await page.route('**/v1/sessions', (route) => route.fulfill({ json: { sessions: [] } }));
  await page.goto(base + 'es/live/');
  await expect(page.locator('#empty-sessions')).toBeVisible();
  await expect(page.locator('#directory-heading')).toHaveText('En directo ahora');
  await page.route('**/v1/sessions', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.locator('#refresh-sessions').click();
  await expect(page.locator('#directory-error')).toBeVisible();
});
test('Live language and theme changes preserve the active peer, media element and room', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { created: 0, closed: 0, plays: 0, marker: Math.random() };
    (window as any).__mediaTest = state;
    class Peer extends EventTarget {
      connectionState = 'connected';
      iceGatheringState = 'complete';
      localDescription: any;
      constructor() {
        super();
        state.created++;
      }
      addTransceiver() {}
      async createOffer() {
        return { type: 'offer', sdp: 'test-offer' };
      }
      async setLocalDescription(value: any) {
        this.localDescription = value;
      }
      async setRemoteDescription() {}
      async getStats() {
        return new Map();
      }
      close() {
        state.closed++;
      }
    }
    (window as any).RTCPeerConnection = Peer;
    HTMLMediaElement.prototype.play = async function () {
      state.plays++;
    };
  });
  const session = {
    id: 'test-room',
    status: 'live',
    title: 'Test session',
    host: { id: 'host', display_name: 'Test host', avatar_color: '#e4ab76' },
    listener_count: 1,
    whep_url: 'https://relay.example/whep',
    program: {
      seq: 1,
      emitted_at: Date.now() / 1000,
      transport: 'playing',
      primary: {
        id: 'track',
        title: 'Test track',
        artist: 'Test artist',
        duration: 120,
        position: 5,
        gain: 1,
      },
    },
  };
  await page.route('**/v1/sessions', (r) => r.fulfill({ json: { sessions: [session] } }));
  await page.route('**/v1/sessions/test-room', (r) => r.fulfill({ json: { session } }));
  await page.route('https://relay.example/**', (r) =>
    r.fulfill({ status: 200, body: r.request().method() === 'POST' ? 'test-answer' : '' }),
  );
  await page.route('**/socket.io/**', (r) => r.abort());
  await page.goto(base + 'live/?session=test-room');
  await expect(page.locator('#room-view')).toBeVisible();
  await page.locator('#listen-live').click();
  await expect(page.locator('#listen-live')).toHaveText('Listening live');
  await page.evaluate(() => {
    (window as any).__audio = document.querySelector('#live-audio');
    (window as any).__mediaTest.before = (window as any).__mediaTest.created;
  });
  await page.locator('[data-language-switch]').click();
  await expect(page).toHaveURL(new RegExp('/es/live/\\?session=test-room$'));
  await expect(page.locator('#listen-live')).toHaveText('Escuchando en directo');
  await expect(page.locator('#listener-count')).toHaveText('1 oyente');
  await page.selectOption('#theme-select', 'dark');
  expect(
    await page.evaluate(() => ({
      created: (window as any).__mediaTest.created,
      before: (window as any).__mediaTest.before,
      closed: (window as any).__mediaTest.closed,
      sameAudio: (window as any).__audio === document.querySelector('#live-audio'),
    })),
  ).toEqual({ created: 1, before: 1, closed: 0, sameAudio: true });
  await page.locator('#leave-room').click();
  await expect(page.locator('#directory-view')).toBeVisible();
  await expect(page).toHaveURL(new RegExp('/es/live/$'));
});

test('Live never translates titles, artist names or session names', async ({ page }) => {
  const session = {
    id: 'words',
    status: 'live',
    title: 'Live',
    host: { id: 'host', display_name: 'Waiting' },
    listener_count: 0,
    program: {
      seq: 1,
      emitted_at: Date.now() / 1000,
      transport: 'playing',
      primary: {
        id: 'song',
        title: 'Waiting',
        artist: 'Reconnecting',
        duration: 90,
        position: 0,
        gain: 1,
      },
    },
  };
  await page.route('**/v1/sessions', (r) => r.fulfill({ json: { sessions: [session] } }));
  await page.route('**/socket.io/**', (r) => r.abort());
  await page.goto(base + 'es/live/');
  await expect(page.locator('.live-card-copy strong')).toHaveText('Live');
  await expect(page.locator('.live-state')).toHaveText('En directo');
  await page.locator('.live-card').click();
  await expect(page.locator('#room-title')).toHaveText('Waiting');
  await expect(page.locator('#room-artist')).toHaveText('Reconnecting');
  await expect(page.locator('#room-host')).toHaveText('Waiting');
});

test('Docker quick start persists the release pin and stops if the directory exists', async ({
  page,
}) => {
  await page.goto(base + 'start/');
  await page.locator('#docker-commands summary').click();
  const code = await page.locator('#docker-commands code').textContent();
  expect(code).toContain('mkdir soundsible && cd soundsible &&');
  expect(code).toMatch(/SOUNDSIBLE_TAG=\d+\.\d+\.\d+/);
  expect(code).toContain(' > .env &&');
  expect(code).not.toContain('/main/');
  expect(code).not.toContain(':edge');
});
test('the screenshot carousel keeps rotating after a slide is picked by hand', async ({ page }) => {
  await page.goto(base);
  const dots = page.locator('[data-shot-dot]');
  await expect(dots).toHaveCount(4);
  // Picking a slide with the mouse leaves focus on the dot; autoplay must not
  // treat that as a reader holding the carousel.
  await dots.nth(2).click();
  await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true');
  await page.mouse.move(0, 0);
  await expect(dots.nth(3)).toHaveAttribute('aria-current', 'true', { timeout: 9000 });
  // The pointer resting on the carousel holds it, and moving away releases it.
  await page.locator('.product-figure').hover();
  const held = await dots.nth(3).getAttribute('aria-current');
  await page.waitForTimeout(6500);
  expect(await dots.nth(3).getAttribute('aria-current')).toBe(held);
  await page.mouse.move(0, 0);
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true', { timeout: 9000 });
  // The pause control stops it outright.
  await page.locator('[data-shot-toggle]').click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(6500);
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
});
