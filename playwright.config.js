const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    // Where the test files live.
    testDir: './tests',
    // Console summary plus an HTML report you can open afterwards.
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        headless: true,
        // Evidence is saved automatically when a test fails.
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure'
    }
});