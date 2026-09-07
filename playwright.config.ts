import { defineConfig } from '@playwright/test';
const [owner, repository] = (
  process.env.GITHUB_REPOSITORY ?? 'Arzuparreta/soundsible.github.io'
).split('/');
const base = repository === `${owner}.github.io` ? '/' : `/${repository}/`;
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 3,
  timeout: 30000,
  expect: { timeout: 7000 },
  use: {
    baseURL: `http://127.0.0.1:4321${base}`,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4321',
    url: `http://127.0.0.1:4321${base}`,
    reuseExistingServer: !process.env.CI,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
