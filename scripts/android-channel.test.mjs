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
describe('independent Android alpha channel', () => {
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
