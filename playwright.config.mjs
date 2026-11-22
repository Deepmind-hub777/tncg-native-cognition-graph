import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './09-learning-library/qianziwen/tests',
  testMatch: 'page.spec.mjs',
  use: { baseURL: 'http://127.0.0.1:4189', launchOptions: { executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' } },
  webServer: { command: 'node 09-learning-library/qianziwen/tools/serve.mjs', url: 'http://127.0.0.1:4189', reuseExistingServer: true, timeout: 15000, env: { HOST:'127.0.0.1', PORT:'4189' } }
});
