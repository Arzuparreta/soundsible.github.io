import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const themes = [{ id: 'light' }, { id: 'dark' }];
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
  for (const { id: theme } of themes) {
    test(`${locale} ${theme}: navigation, layout and accessibility`, async ({ page }) => {
      test.setTimeout(60000);
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
  await page.locator('#theme-toggle').click();
  await page.locator('#theme-toggle').click();
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
  await page.locator('.mobile-doc-nav > summary').click();
  await expect(page.locator('.mobile-doc-nav nav')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.mobile-doc-nav > summary').click();
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
  await page.locator('#theme-toggle').click();
  await page.locator('#theme-toggle').click();
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
test('the screenshot carousel stays still until the user steps', async ({ page }) => {
  await page.clock.install();
  await page.goto(base);
  const current = page.locator('.shot.is-current');
  await expect(page.locator('.shot')).toHaveCount(4);
  await expect(current).toHaveAttribute('data-shot-index', '0');
  await page.clock.fastForward(30000);
  await expect(current).toHaveAttribute('data-shot-index', '0');
  await page.locator('.shot-arrow.next').click();
  await expect(current).toHaveAttribute('data-shot-index', '1');
  await page.clock.fastForward(30000);
  await expect(current).toHaveAttribute('data-shot-index', '1');
});
test('the arrows step through the screenshots and wrap around', async ({ page }) => {
  // The arrows are the only way to advance.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  const current = page.locator('.shot.is-current');
  await expect(current).toHaveAttribute('data-shot-index', '0');
  await page.locator('.shot-arrow.next').click();
  await expect(current).toHaveAttribute('data-shot-index', '1');
  await page.locator('.shot-arrow.prev').click();
  await expect(current).toHaveAttribute('data-shot-index', '0');
  await page.locator('.shot-arrow.prev').click();
  await expect(current).toHaveAttribute('data-shot-index', '3');
  await page.locator('.shot-arrow.next').click();
  await expect(current).toHaveAttribute('data-shot-index', '0');
  // Nothing is moving on its own.
  await page.waitForTimeout(6500);
  await expect(current).toHaveAttribute('data-shot-index', '0');
});
test('the screenshots are the ones taken in the theme the page wears', async ({ page }) => {
  // Reduced motion parks autoplay, so the first slide stays on show.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requested = new Set<string>();
  page.on('request', (request) => {
    const theme = request.url().match(/\/screenshots\/([^/]+)\//)?.[1];
    if (theme) requested.add(theme);
  });
  await page.addInitScript(() => localStorage.setItem('soundsible:site-theme', 'light'));
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  // Each slide holds its screen in every theme; only the page's own is fetched.
  expect([...requested]).toEqual(['light']);
  const shown = () =>
    page
      .locator('.shot.is-current img')
      .evaluateAll((images) =>
        images.filter((image) => image.checkVisibility()).map((image) => image.className),
      );
  for (const { id } of themes) {
    if (id === 'dark') await page.locator('#theme-toggle').click();
    await expect.poll(shown).toEqual([`theme-${id}`]);
    await page.locator('.shot.is-current').click();
    await expect(page.locator('#image-dialog img')).toHaveAttribute(
      'src',
      new RegExp(`/screenshots/${id}/`),
    );
    await page.locator('#image-dialog [data-close-dialog]').click();
  }
});

test('Get Started orders Native, Docker, Desktop and Android with status tags', async ({
  page,
}) => {
  await page.goto(base + 'start/');
  const headings = await page.locator('.install-option h2').allTextContents();
  expect(headings.slice(0, 3)).toEqual(['Native installation', 'Docker', 'Desktop app']);
  await expect(page.locator('.install-option').nth(0).locator('.tag.tag-primary')).toHaveText(
    'PRIMARY METHOD',
  );
  await expect(page.locator('.install-option').nth(1).locator('.tag')).toHaveCount(0);
  await expect(page.locator('.install-option').nth(2).locator('.tag.tag-prerelease')).toHaveText(
    'BETA',
  );
});

test('mobile captures are separate, fill their frame and enlarge individually', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  const current = page.locator('.shot.is-current');
  for (let i = 0; i < 2; i++) await page.locator('.shot-arrow.next').click();
  for (const name of ['mobile-library', 'mobile-now-playing']) {
    await expect(current).toHaveAttribute('data-portrait', '');
    const img = current.locator('img:visible');
    await expect(img).toHaveAttribute('src', new RegExp(name));
    const frame = await current.boundingBox();
    const image = await img.boundingBox();
    expect(Math.abs(frame!.height - image!.height)).toBeLessThan(2);
    expect(Math.abs(frame!.width - image!.width)).toBeLessThan(2);
    await current.click();
    await expect(page.locator('#image-dialog img')).toHaveAttribute('src', new RegExp(name));
    const enlarged = await page.locator('#image-dialog img').boundingBox();
    expect(enlarged!.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Escape');
    await page.locator('.shot-arrow.next').click();
  }
});

test('documentation opens its root inside the shared navigation', async ({ page }) => {
  for (const locale of ['', 'es/']) {
    await page.goto(`${base}${locale}docs/`);
    await expect(page.locator('.docs-sidebar .sidebar-title')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('main .doc-index-link')).toHaveCount(10);
    const more = page.locator('.docs-sidebar details.sidebar-group');
    await expect(more).not.toHaveAttribute('open');
    await more.locator('summary').click();
    await expect(more.locator('a').first()).toBeVisible();
    await more.locator('summary').click();
    await expect(more.locator('a').first()).toBeHidden();
    await page.locator('main a[href$="docs/native-installation/"]').click();
    await expect(page.locator('.docs-sidebar')).toBeVisible();
    await page.locator('.docs-sidebar .sidebar-title').click();
    await expect(page.locator('.docs-root')).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-doc-nav')).toBeVisible();
  await page.locator('.mobile-doc-nav > summary').click();
  await expect(page.locator('.mobile-doc-nav .sidebar-title')).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('theme button cycles through system, light and dark and follows the OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(base);
  const toggle = page.locator('#theme-toggle');
  await expect(toggle).toHaveAttribute('data-mode', 'system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-mode', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-mode', 'dark');
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-mode', 'system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
