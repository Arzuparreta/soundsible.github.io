const prefix = 'https://github.com/Arzuparreta/soundsible/releases/';
const tagPattern = /^android-alpha\/(.+)-(\d+)-[0-9a-f]{12}$/;

/** Only published Android prereleases with the complete public asset set qualify. */
export function selectAndroidRelease(releases) {
  const candidates = releases.flatMap((release) => {
    const match = tagPattern.exec(release.tag_name ?? '');
    if (!match || release.draft || !release.prerelease || !release.html_url?.startsWith(prefix))
      return [];
    const asset = (name) =>
      release.assets?.find(
        (item) =>
          item.name === name &&
          item.state === 'uploaded' &&
          item.browser_download_url?.startsWith(prefix + 'download/'),
      )?.browser_download_url;
    const apk = asset('Soundsible-Android-alpha.apk');
    const checksum = asset('SHA256SUMS');
    const metadata = asset('android-release.json');
    const acceptance = asset('release-acceptance.json');
    return apk && checksum && metadata && acceptance
      ? [
          {
            version: match[1],
            build: Number(match[2]),
            url: release.html_url,
            apk,
            checksum,
            metadata,
          },
        ]
      : [];
  });
  return candidates.sort((a, b) => b.build - a.build)[0] ?? null;
}
