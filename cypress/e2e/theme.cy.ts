/// <reference types="cypress" />

/*
 * E2E — Dark Mode / Theme Toggle
 * Verifies the ThemeToggle renders correctly, applies the right CSS
 * classes, and persists the chosen theme across page navigations.
 */

describe("Theme Toggle", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  /* ── Rendering ────────────────────────────────────────────────── */
  it("renders the theme toggle in the navbar with three options", () => {
    cy.get('[aria-label="Choose colour theme"]')
      .should("be.visible")
      .within(() => {
        cy.get('[aria-label="Light mode"]').should("exist");
        cy.get('[aria-label="Dark mode"]').should("exist");
        cy.get('[aria-label="System mode"]').should("exist");
      });
  });

  it("renders the theme toggle in the mobile drawer", () => {
    cy.viewport(375, 812);
    cy.get('[aria-label="Open menu"]').click();
    cy.contains("Theme").should("be.visible");
    cy.get('[aria-label="Choose colour theme"]').should("exist");
  });

  /* ── Dark mode activation ─────────────────────────────────────── */
  it("applies the dark class to <html> when Dark is selected", () => {
    cy.get('[aria-label="Dark mode"]').click();
    cy.get("html").should("have.class", "dark");
  });

  it("removes the dark class from <html> when Light is selected", () => {
    /* Start in dark mode */
    cy.get('[aria-label="Dark mode"]').click();
    cy.get("html").should("have.class", "dark");

    /* Switch to light */
    cy.get('[aria-label="Light mode"]').click();
    cy.get("html").should("not.have.class", "dark");
  });

  /* ── aria-pressed state ────────────────────────────────────────── */
  it("marks the active mode button with aria-pressed=true after mount", () => {
    /* Click dark mode and verify aria-pressed reflects the choice */
    cy.get('[aria-label="Dark mode"]').click();
    cy.get('[aria-label="Dark mode"]').should("have.attr", "aria-pressed", "true");
    cy.get('[aria-label="Light mode"]').should("have.attr", "aria-pressed", "false");
    cy.get('[aria-label="System mode"]').should("have.attr", "aria-pressed", "false");
  });

  /* ── localStorage persistence ─────────────────────────────────── */
  it("persists the selected theme in localStorage", () => {
    cy.get('[aria-label="Dark mode"]').click();
    cy.window().then((win) => {
      expect(win.localStorage.getItem("prakash-theme")).to.eq("dark");
    });
  });

  it("persists 'light' in localStorage when Light mode is selected", () => {
    cy.get('[aria-label="Light mode"]').click();
    cy.window().then((win) => {
      expect(win.localStorage.getItem("prakash-theme")).to.eq("light");
    });
  });

  it("persists 'system' in localStorage when System mode is selected", () => {
    cy.get('[aria-label="System mode"]').click();
    cy.window().then((win) => {
      expect(win.localStorage.getItem("prakash-theme")).to.eq("system");
    });
  });

  /* ── Persistence across navigation ───────────────────────────── */
  it("retains the dark theme when navigating to another page", () => {
    cy.get('[aria-label="Dark mode"]').click();
    cy.get("html").should("have.class", "dark");

    cy.visit("/products");
    cy.get("html").should("have.class", "dark");
  });

  it("retains the light theme when navigating to another page", () => {
    /* First, set dark, then switch to light */
    cy.get('[aria-label="Dark mode"]').click();
    cy.get('[aria-label="Light mode"]').click();
    cy.get("html").should("not.have.class", "dark");

    cy.visit("/categories");
    cy.get("html").should("not.have.class", "dark");
  });

  it("applies the stored theme on fresh page load (no flash)", () => {
    /* Set dark mode and reload the page */
    cy.get('[aria-label="Dark mode"]').click();
    cy.window().then((win) => {
      expect(win.localStorage.getItem("prakash-theme")).to.eq("dark");
    });

    cy.reload();
    /*
     * The blocking <script> in layout.tsx should apply the class before
     * React mounts, so the html element must already have 'dark' immediately
     * after the page loads (no visible flash).
     */
    cy.get("html").should("have.class", "dark");
  });
});
