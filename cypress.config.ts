import { defineConfig } from "cypress";

export default defineConfig({
  /* ── E2E ──────────────────────────────────────────────────────── */
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    /*
     * Test isolation: each test gets a fresh browser context (cookies, localStorage, etc.).
     * Set to false if you intentionally chain state across tests in a describe block.
     */
    testIsolation: true,
    env: {
      /*
       * Override via cypress.env.json (git-ignored) or CLI --env flag.
       * These are only used for the programmatic-login custom command —
       * never put real credentials in version control.
       */
      TEST_USER_EMAIL: "customer@example.com",
      TEST_USER_PASSWORD: "TestPassword1",
      TEST_ADMIN_EMAIL: "admin@example.com",
      TEST_ADMIN_PASSWORD: "AdminPassword1",
    },
    setupNodeEvents(on) {
      on("before:browser:launch", (browser, launchOptions) => {
        // --no-sandbox / --disable-dev-shm-usage are Linux CI flags and crash
        // macOS ARM64 Electron. Only apply them on non-macOS platforms for
        // Chromium browsers (never Electron, which is Cypress's own shell).
        if (process.platform !== "darwin" && browser.family === "chromium" && browser.name !== "electron") {
          launchOptions.args.push("--no-sandbox");
          launchOptions.args.push("--disable-dev-shm-usage");
        }
        return launchOptions;
      });
    },
  },

  /* ── Component ────────────────────────────────────────────────── */
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    specPattern: "cypress/component/**/*.cy.tsx",
    supportFile: "cypress/support/component.ts",
    viewportWidth: 800,
    viewportHeight: 600,
    video: false,
  },
});
