import snapshot from '../generated/android-release.json';

export interface AndroidRelease {
  version: string;
  build: number;
  url: string;
  apk: string;
  checksum: string;
  metadata: string;
}

export const androidRelease = snapshot as AndroidRelease | null;
