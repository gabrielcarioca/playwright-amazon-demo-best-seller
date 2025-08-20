import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    expect: { timeout: 8_000 },
    retries: 1,
    reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
    use: {
        baseURL: process.env.BASE_URL ?? 'https://www.amazon.com',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure'
    },
    projects: [
        {name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ]
});