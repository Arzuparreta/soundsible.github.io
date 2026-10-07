import { mkdir, writeFile } from 'node:fs/promises';
import { selectAndroidRelease } from './android-channel.mjs';

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Soundsible-site' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const releases = [];
for (let page = 1; ; page++) {
  const response = await fetch(
    `https://api.github.com/repos/Arzuparreta/soundsible/releases?per_page=100&page=${page}`,
    { headers },
  );
  if (!response.ok) throw new Error(`Android channel lookup failed: ${response.status}`);
  const batch = await response.json();
  releases.push(...batch);
  if (batch.length < 100) break;
}
const release = selectAndroidRelease(releases);
await mkdir('src/generated', { recursive: true });
await writeFile('src/generated/android-release.json', JSON.stringify(release, null, 2) + '\n');
console.log(release ? `Android alpha build ${release.build}` : 'No published Android alpha');
