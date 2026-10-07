import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function bridge(androidPublished: boolean, userAgent: string, valid = true) {
  const { document } = parseHTML(`<html><body>
    <div id="loading"></div><div id="invalid" hidden></div><div id="track" hidden></div>
    <p id="track-title"></p><p id="track-artist"></p><a id="open-youtube"></a>
    <form id="instance-form"></form><input id="instance-url"><p id="instance-error" hidden></p>
    ${androidPublished ? '<div id="android-actions" hidden><a id="open-android"></a></div>' : ''}
    </body></html>`);
  const capsule = Buffer.from(
    JSON.stringify({
      v: 1,
      kind: 'music',
      yt: 'abcdefghijk',
      title: 'Shared song',
      artist: 'Artist',
    }),
  ).toString('base64url');
  const replace = vi.fn();
  vi.stubGlobal('document', document);
  vi.stubGlobal('navigator', { userAgent });
  vi.stubGlobal('localStorage', {
    getItem: () => 'https://music.example/player/',
    setItem: vi.fn(),
  });
  vi.stubGlobal('window', { location: { hash: valid ? `#t=${capsule}` : '#t=invalid', replace } });
  await import('./open-track');
  return { document, replace, capsule };
}

describe('published Android bridge', () => {
  it('preserves the existing web redirect until an APK is public', async () => {
    const result = await bridge(false, 'Android');
    expect(result.replace).toHaveBeenCalledOnce();
    expect(result.document.getElementById('open-android')).toBeNull();
  });
  it('offers an explicit native action on Android without losing the capsule', async () => {
    const { document, replace, capsule } = await bridge(true, 'Android');
    expect(replace).not.toHaveBeenCalled();
    expect((document.getElementById('instance-url') as HTMLInputElement).value).toBe(
      'https://music.example/player/',
    );
    const event = new document.defaultView!.Event('submit', { cancelable: true });
    document.getElementById('instance-form')!.dispatchEvent(event);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('https://music.example/player/'));
    expect(document.getElementById('android-actions')?.hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('open-android')?.getAttribute('href')).toBe(
      `soundsible://open?shared=${capsule}`,
    );
  });
  it('retains the saved web destination on other platforms', async () => {
    expect((await bridge(true, 'Linux desktop')).replace).toHaveBeenCalledOnce();
  });
  it('never offers app navigation for an invalid capsule', async () => {
    const { document, replace } = await bridge(true, 'Android', false);
    expect(replace).not.toHaveBeenCalled();
    expect(document.getElementById('android-actions')?.hasAttribute('hidden')).toBe(true);
    expect(document.getElementById('invalid')?.hasAttribute('hidden')).toBe(false);
  });
});
