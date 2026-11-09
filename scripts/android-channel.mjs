const prefix = 'https://github.com/Arzuparreta/soundsible/releases/';
const tagPattern = /^android-alpha\/(.+)-(\d+)-[0-9a-f]{12}$/;
const stablePattern = /^v(\d+)\.(\d+)\.(\d+)$/;

/** Published stable releases carry the alpha APK; retain old alpha tags as fallback. */
export function selectAndroidRelease(releases) {
  const candidates = releases.flatMap((release) => {
    const match = tagPattern.exec(release.tag_name ?? '');
    const stable = stablePattern.exec(release.tag_name ?? '');
    if (
      (!match && !stable) ||
      release.draft ||
      (stable ? release.prerelease : !release.prerelease) ||
      !release.html_url?.startsWith(prefix)
    )
      return [];
    // Same monotonic versionCode layout as the published Android APK. Legacy
    // alpha build codes precede release-derived codes, regardless of dates.
    const [major, minor, patch] = stable ? stable.slice(1).map(Number) : [];
    const build = stable ? ((major * 100 + minor) * 100 + patch) * 100 + 99 : Number(match[2]);
    if (
      !Number.isSafeInteger(build) ||
      build <= 0 ||
      build > 2_100_000_000 ||
      (stable && (minor > 99 || patch > 99))
    )
      return [];
    const asset = (name) =>
      release.assets?.find(
        (item) =>
          item.name === name &&
          item.state === 'uploaded' &&
          item.browser_download_url?.startsWith(prefix + 'download/'),
      )?.browser_download_url;
    const apk = asset('Soundsible-Android-alpha.apk');
    const checksum = asset(stable ? 'SHA256SUMS-android.txt' : 'SHA256SUMS');
    const metadata = asset('android-release.json');
    const acceptance = asset('release-acceptance.json');
    return apk && checksum && metadata && acceptance
      ? [
          {
            version: stable ? stable.slice(1).join('.') : match[1],
            build,
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
