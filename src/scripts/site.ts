import { type Locale } from '../lib/site';
const language = (): Locale => (document.documentElement.lang === 'es' ? 'es' : 'en');
const choose = (en: string, es: string) => (language() === 'es' ? es : en);
const base = (document.body.dataset.base ?? '/').replace(/\/?$/, '/');
const theme = document.querySelector<HTMLSelectElement>('#theme-select');
const media = matchMedia('(prefers-color-scheme: dark)');
let themeChoice = 'system';
try {
  themeChoice = localStorage.getItem('soundsible:site-theme') ?? 'system';
} catch {}
if (!['system', 'light', 'dark'].includes(themeChoice)) themeChoice = 'system';
function applyTheme() {
  document.documentElement.dataset.theme =
    themeChoice === 'system' ? (media.matches ? 'dark' : 'light') : themeChoice;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      document.documentElement.dataset.theme === 'dark' ? '#151715' : '#f8f8f5',
    );
  if (theme) theme.value = themeChoice;
}
applyTheme();
media.addEventListener('change', applyTheme);
theme?.addEventListener('change', () => {
  themeChoice = theme.value;
  try {
    localStorage.setItem('soundsible:site-theme', themeChoice);
  } catch {}
  applyTheme();
});
const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
const mobile = document.querySelector<HTMLElement>('#mobile-nav');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  if (mobile) mobile.hidden = !expanded;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    menu.setAttribute('aria-expanded', 'false');
    if (mobile) mobile.hidden = true;
    menu.focus();
  }
});
const switcher = document.querySelector<HTMLAnchorElement>('[data-language-switch]');
function updateLanguageLink() {
  if (!switcher) return;
  const relative = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : '';
  let path = relative.replace(/^es\//, '');
  if (path === '404.html' && language() === 'en') path = '404/';
  else if (path === '404/' && language() === 'es') path = '404.html';
  switcher.href =
    base + (language() === 'en' ? 'es/' : '') + path + location.search + location.hash;
}
function localizeStatic() {
  document.querySelectorAll<HTMLElement>('[data-en][data-es]').forEach((el) => {
    el.textContent = el.dataset[language()] ?? '';
  });
  for (const attr of ['placeholder', 'aria-label', 'title']) {
    document.querySelectorAll<HTMLElement>(`[data-${attr}-en]`).forEach((el) => {
      const value = el.getAttribute(`data-${attr}-${language()}`);
      if (value) el.setAttribute(attr, value);
    });
  }
  document
    .querySelectorAll<HTMLAnchorElement>('[data-site-path]')
    .forEach(
      (link) =>
        (link.href = base + (language() === 'es' ? 'es/' : '') + (link.dataset.sitePath ?? '')),
    );
  if (switcher) {
    switcher.textContent = language() === 'es' ? 'EN' : 'ES';
    switcher.hreflang = language() === 'es' ? 'en' : 'es';
    switcher.lang = switcher.hreflang;
    switcher.setAttribute('aria-label', choose('Leer en español', 'Read in English'));
  }
  updateLanguageLink();
}
updateLanguageLink();
window.addEventListener('hashchange', updateLanguageLink);
window.addEventListener('popstate', () => {
  if (document.body.dataset.page !== 'live/') return;
  const next = location.pathname.slice(base.length).startsWith('es/') ? 'es' : 'en';
  if (next !== language()) {
    document.documentElement.lang = next;
    localizeStatic();
    document.dispatchEvent(new CustomEvent('site:locale', { detail: next }));
  }
  updateLanguageLink();
});
switcher?.addEventListener('click', (event) => {
  updateLanguageLink();
  if (
    document.body.dataset.page !== 'live/' ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  const next = language() === 'en' ? 'es' : 'en';
  history.replaceState(history.state, '', switcher.href);
  document.documentElement.lang = next;
  localizeStatic();
  document.title = choose('Soundsible Live — Listen together', 'Soundsible Live — Escuchar juntos');
  const description = choose(
    'Listen to music broadcast live from Soundsible.',
    'Escucha música emitida en directo desde Soundsible.',
  );
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute('href', location.origin + location.pathname);
  searchUI?.destroy();
  searchUI = undefined;
  searchLocale = undefined;
  document.dispatchEvent(new CustomEvent('site:locale', { detail: next }));
});
for (const element of document.querySelectorAll<HTMLDialogElement>('dialog')) {
  element
    .querySelectorAll<HTMLElement>('[data-close-dialog]')
    .forEach((button) => button.addEventListener('click', () => element.close()));
  element.addEventListener('click', (event) => {
    if (event.target !== element) return;
    const r = element.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      element.close();
  });
}
const imageDialog = document.querySelector<HTMLDialogElement>('#image-dialog');
const dialogImage = imageDialog?.querySelector('img');
for (const preview of document.querySelectorAll<HTMLAnchorElement>('[data-image-preview]')) {
  preview.addEventListener('click', (event) => {
    const source = preview.querySelector('img');
    if (!imageDialog || !dialogImage || !source) return;
    event.preventDefault();
    dialogImage.src = source.currentSrc || source.src;
    dialogImage.alt = source.alt;
    dialogImage.width = source.naturalWidth || source.width;
    dialogImage.height = source.naturalHeight || source.height;
    imageDialog.showModal();
  });
}

const carousel = document.querySelector<HTMLElement>('[data-carousel]');
if (carousel) {
  const slides = [...carousel.querySelectorAll<HTMLElement>('.shot')];
  const dots = [...carousel.querySelectorAll<HTMLButtonElement>('[data-shot-dot]')];
  const label = carousel.querySelector<HTMLElement>('[data-shot-label]');
  const toggle = carousel.querySelector<HTMLButtonElement>('[data-shot-toggle]');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 5500;
  let current = 0;
  let timer: number | undefined;
  // Autoplay only resumes once nothing is holding it: the reader's pointer or
  // keyboard focus, a hidden tab, the enlarged view, or the pause button.
  let stopped = still.matches;

  function show(next: number) {
    if (next === current) return;
    slides[current].classList.remove('is-current');
    slides[current].classList.add('is-leaving');
    const leaving = slides[current];
    window.setTimeout(() => leaving.classList.remove('is-leaving'), 620);
    current = next;
    slides[current].classList.add('is-current');
    for (const [index, dot] of dots.entries())
      if (index === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    if (label) label.textContent = slides[current].dataset.shotCaption ?? label.textContent;
  }

  function play() {
    window.clearInterval(timer);
    if (stopped || carousel!.matches(':hover, :focus-within') || document.hidden) return;
    if (imageDialog?.open) return;
    timer = window.setInterval(() => show((current + 1) % slides.length), interval);
  }

  function markToggle() {
    if (!toggle) return;
    const paused = stopped;
    toggle.toggleAttribute('data-paused', paused);
    const text = paused ? toggle.dataset.labelPlay : toggle.dataset.labelPause;
    if (text) toggle.setAttribute('aria-label', text);
  }

  // Opening the enlarged view must not advance the slide behind it.
  for (const slide of slides) slide.addEventListener('click', () => window.clearInterval(timer));
  for (const [index, dot] of dots.entries())
    dot.addEventListener('click', () => {
      show(index);
      play();
    });
  toggle?.addEventListener('click', () => {
    stopped = !stopped;
    markToggle();
    play();
  });
  for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout'])
    carousel.addEventListener(event, play);
  document.addEventListener('visibilitychange', play);
  imageDialog?.addEventListener('close', play);
  still.addEventListener('change', (event) => {
    stopped = event.matches;
    markToggle();
    play();
  });
  markToggle();
  play();
}
const searchDialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const search = document.querySelector<HTMLElement>('#search');
let searchUI: { destroy(): void } | undefined;
let searchLocale: Locale | undefined;
let uiLoading: Promise<void> | undefined;
function loadSearchUI(): Promise<void> {
  if (uiLoading) return uiLoading;
  uiLoading = new Promise<void>((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'pagefind/pagefind-ui.css';
    document.head.append(css);
    const script = document.createElement('script');
    script.src = base + 'pagefind/pagefind-ui.js';
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      css.remove();
      uiLoading = undefined;
      reject(new Error('Search bundle unavailable'));
    };
    document.head.append(script);
  });
  return uiLoading;
}
async function openSearch() {
  if (!searchDialog || !search) return;
  if (!searchDialog.open) searchDialog.showModal();
  document.querySelector<HTMLElement>('#search-error')!.hidden = true;
  try {
    await loadSearchUI();
    if (!searchUI || searchLocale !== language()) {
      searchUI?.destroy();
      search.replaceChildren();
      const Constructor = (
        window as unknown as {
          PagefindUI: new (options: Record<string, unknown>) => { destroy(): void };
        }
      ).PagefindUI;
      searchUI = new Constructor({
        element: '#search',
        bundlePath: base + 'pagefind/',
        baseUrl: base,
        showSubResults: true,
        showImages: false,
        resetStyles: false,
        translations:
          language() === 'es'
            ? {
                placeholder: 'Buscar en la documentación',
                zero_results: 'No hay resultados para [SEARCH_TERM]',
                many_results: '[COUNT] resultados para [SEARCH_TERM]',
                one_result: '[COUNT] resultado para [SEARCH_TERM]',
                searching: 'Buscando…',
                load_more: 'Mostrar más resultados',
                clear_search: 'Borrar búsqueda',
                search_label: 'Buscar en la documentación',
              }
            : undefined,
      });
      searchLocale = language();
      search.dataset.status = 'ready';
    }
    window.setTimeout(() => search.querySelector<HTMLInputElement>('input')?.focus(), 0);
  } catch {
    search.dataset.status = 'error';
    document.querySelector<HTMLElement>('#search-error')!.hidden = false;
  }
}
document
  .querySelectorAll('[data-search-open]')
  .forEach((button) => button.addEventListener('click', () => void openSearch()));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    void openSearch();
  }
});
for (const pre of document.querySelectorAll<HTMLElement>('.prose pre,.install-code pre')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-button';
  button.textContent = choose('Copy', 'Copiar');
  button.setAttribute('aria-label', choose('Copy code', 'Copiar código'));
  button.addEventListener('click', () => {
    const code = pre.querySelector('code')?.textContent ?? '';
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        button.textContent = choose('Copied', 'Copiado');
      })
      .catch(() => {
        button.textContent = choose('Select code to copy', 'Selecciona el código');
      })
      .finally(() =>
        window.setTimeout(() => (button.textContent = choose('Copy', 'Copiar')), 2500),
      );
  });
  pre.append(button);
}
for (const heading of document.querySelectorAll<HTMLElement>('.prose :is(h1,h2,h3,h4)[id]')) {
  const link = document.createElement('a');
  link.className = 'heading-link';
  link.href = '#' + heading.id;
  link.textContent = '#';
  link.setAttribute(
    'aria-label',
    choose('Link to this section: ', 'Enlace a este apartado: ') + (heading.textContent ?? ''),
  );
  link.dataset.pagefindIgnore = 'all';
  heading.append(link);
}
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-os]')];
function activateTab(tab: HTMLButtonElement) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls')!);
    if (panel) panel.hidden = !active;
  });
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event) => {
    let target;
    if (event.key === 'ArrowRight') target = tabs[(i + 1) % tabs.length];
    if (event.key === 'ArrowLeft') target = tabs[(i + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') target = tabs[0];
    if (event.key === 'End') target = tabs.at(-1);
    if (target) {
      event.preventDefault();
      activateTab(target);
      target.focus();
    }
  });
});
document.querySelectorAll<HTMLAnchorElement>('.mobile-doc-nav a').forEach((link) =>
  link.addEventListener('click', () => {
    if (link.hash)
      document.querySelector<HTMLDetailsElement>('.mobile-doc-nav')?.removeAttribute('open');
  }),
);
