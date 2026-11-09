import { describe, expect, it } from 'vitest';
import { selectAndroidRelease } from './android-channel.mjs';

const version = 'test-version';
const published = (build) => ({
  tag_name: `android-alpha/${version}-${build}-${'a'.repeat(12)}`,
  draft: false,
  prerelease: true,
  html_url: `https://github.com/Arzuparreta/soundsible/releases/tag/android-alpha/test-${build}`,
  assets: [
    'Soundsible-Android-alpha.apk',
    'SHA256SUMS',
    'android-release.json',
    'release-acceptance.json',
  ].map((name) => ({
    name,
    state: 'uploaded',
    browser_download_url: `https://github.com/Arzuparreta/soundsible/releases/download/android-alpha/test-${build}/${name}`,
  })),
});
const stable = (version) => {
  const release = published(1);
  release.tag_name = `v${version}`;
  release.prerelease = false;
  release.html_url = `https://github.com/Arzuparreta/soundsible/releases/tag/${release.tag_name}`;
  release.assets = release.assets.map((asset) => {
    const name = asset.name === 'SHA256SUMS' ? 'SHA256SUMS-android.txt' : asset.name;
    return {
      ...asset,
      name,
      browser_download_url: `https://github.com/Arzuparreta/soundsible/releases/download/${release.tag_name}/${name}`,
    };
  });
  return release;
};
describe('published Android alpha APKs', () => {
  it('selects the newest complete stable APK ahead of retired alpha tags', () => {
    const selected = selectAndroidRelease([
      stable('1.2.3'),
      published(8),
      stable('1.3.0'),
      stable('1.2.10'),
    ]);
    expect(selected.version).toBe('1.3.0');
    expect(selected.build).toBe(1_030_099);
    expect(selected.checksum).toBe(stable('1.3.0').assets[1].browser_download_url);
  });
  it('keeps the previous complete APK while a new release is incomplete', () => {
    const next = stable('1.3.0');
    next.assets = next.assets.filter((asset) => asset.name !== 'release-acceptance.json');
    expect(selectAndroidRelease([next, stable('1.2.3')]).version).toBe('1.2.3');
  });
  it('rejects draft and prerelease APKs in the stable channel', () => {
    expect(selectAndroidRelease([{ ...stable('1.2.3'), draft: true }])).toBeNull();
    expect(selectAndroidRelease([{ ...stable('1.2.3'), prerelease: true }])).toBeNull();
    expect(selectAndroidRelease([{ ...stable('1.2.3'), tag_name: 'v1.2.3-rc.1' }])).toBeNull();
  });
  it('does not accept incomplete or substituted current checksum assets', () => {
    const next = stable('1.2.3');
    next.assets[1].browser_download_url = 'https://example.org/fake-checksums';
    expect(selectAndroidRelease([next])).toBeNull();
    next.assets[1].name = 'SHA256SUMS';
    expect(selectAndroidRelease([next])).toBeNull();
  });
  it('selects the highest public code, regardless of dates and global latest', () => {
    expect(
      selectAndroidRelease([published(8), published(3), { tag_name: 'global-stable' }])?.build,
    ).toBe(8);
  });
  it('does not expose drafts or incomplete uploads', () => {
    expect(
      selectAndroidRelease([
        { ...published(9), draft: true },
        { ...published(10), assets: [] },
      ]),
    ).toBeNull();
    expect(selectAndroidRelease([{ ...published(9), prerelease: false }])).toBeNull();
  });
  it('does not accept substituted download hosts', () => {
    const bad = published(9);
    bad.assets[0].browser_download_url = 'https://example.org/fake.apk';
    expect(selectAndroidRelease([bad])).toBeNull();
  });
});
