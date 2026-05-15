/// <reference types="cypress" />
import "@testing-library/cypress/add-commands";

/* ─────────────────────────────────────────────────────────────────
 * Custom commands — extend the Cypress.Chainable interface below.
 * ─────────────────────────────────────────────────────────────── */

/**
 * Programmatic login: POSTs to /api/auth/login, then writes the
 * returned user + token directly into localStorage so tests that
 * require auth don't need to go through the login UI every time.
 *
 * Usage:
 *   cy.loginByApi('customer@example.com', 'TestPassword1')
 */
Cypress.Commands.add(
  "loginByApi",
  (email: string, password: string) => {
    cy.request({
      method: "POST",
      url: "/api/auth/login",
      body: { email, password },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        throw new Error(
          `loginByApi: server returned ${response.status} — check TEST_USER_EMAIL / TEST_USER_PASSWORD env vars and that the dev server is running.`
        );
      }
      const { user, token } = response.body.data;
      /*
       * Zustand's persist middleware stores state under the key defined
       * in the store: "prakash-auth".  Writing it here lets Zustand pick
       * it up on the next page visit without a UI round-trip.
       */
      const authState = {
        state: { user, token, hasHydrated: true },
        version: 0,
      };
      window.localStorage.setItem("prakash-auth", JSON.stringify(authState));
    });
  }
);

/**
 * Clear auth state from localStorage (simulates logout without UI).
 *
 * Usage:
 *   cy.logoutByStorage()
 */
Cypress.Commands.add("logoutByStorage", () => {
  cy.clearLocalStorage("prakash-auth");
});

/* ── TypeScript augmentation ──────────────────────────────────── */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginByApi(email: string, password: string): Chainable<void>;
      logoutByStorage(): Chainable<void>;
    }
  }
}

export {};
