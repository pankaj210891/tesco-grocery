/// <reference types="cypress" />
import React from "react";
import ThemeToggle from "../../src/components/ui/ThemeToggle";
import { ThemeProvider } from "../../src/components/providers/ThemeProvider";

/*
 * Component Tests — ThemeToggle
 * Tests rendering, aria attributes, mode switching, and context integration.
 * The component requires ThemeProvider so every mount wraps it.
 */

const mount = (variant?: "navbar" | "default") =>
  cy.mount(
    <ThemeProvider>
      <ThemeToggle variant={variant} />
    </ThemeProvider>
  );

describe("ThemeToggle component", () => {
  /* ── Rendering ────────────────────────────────────────────────── */
  it("renders the toggle container with role=group", () => {
    mount();
    cy.get('[role="group"]').should("be.visible");
    cy.get('[aria-label="Choose colour theme"]').should("exist");
  });

  it("renders exactly three option buttons", () => {
    mount();
    cy.get('[role="group"] button').should("have.length", 3);
  });

  it("renders Light, Dark, and System mode buttons with aria-labels", () => {
    mount();
    cy.get('[aria-label="Light mode"]').should("exist");
    cy.get('[aria-label="Dark mode"]').should("exist");
    cy.get('[aria-label="System mode"]').should("exist");
  });

  /* ── aria-pressed state ───────────────────────────────────────── */
  it("sets aria-pressed=true only on the active button after mount", () => {
    mount();
    /*
     * Before mount effect runs, all buttons are inactive (aria-pressed=false).
     * After the useEffect fires and mounted=true, one button becomes active.
     * We check that at most one button has aria-pressed=true.
     */
    cy.get('[role="group"] button[aria-pressed="true"]').should("have.length.lte", 1);
  });

  /* ── Mode switching ───────────────────────────────────────────── */
  it("marks the Dark button as pressed after clicking it", () => {
    mount();
    cy.get('[aria-label="Dark mode"]').click();
    cy.get('[aria-label="Dark mode"]').should("have.attr", "aria-pressed", "true");
  });

  it("marks the Light button as pressed after clicking it", () => {
    mount();
    cy.get('[aria-label="Light mode"]').click();
    cy.get('[aria-label="Light mode"]').should("have.attr", "aria-pressed", "true");
  });

  it("marks the System button as pressed after clicking it", () => {
    mount();
    cy.get('[aria-label="System mode"]').click();
    cy.get('[aria-label="System mode"]').should("have.attr", "aria-pressed", "true");
  });

  it("deactivates the previously active button when a new mode is chosen", () => {
    mount();
    cy.get('[aria-label="Dark mode"]').click();
    cy.get('[aria-label="Dark mode"]').should("have.attr", "aria-pressed", "true");

    cy.get('[aria-label="Light mode"]').click();
    cy.get('[aria-label="Dark mode"]').should("have.attr", "aria-pressed", "false");
    cy.get('[aria-label="Light mode"]').should("have.attr", "aria-pressed", "true");
  });

  /* ── Dark-class side-effect ──────────────────────────────────── */
  it("adds the dark class to <html> when Dark mode is selected", () => {
    mount();
    cy.get('[aria-label="Dark mode"]').click();
    cy.get("html").should("have.class", "dark");
  });

  it("removes the dark class from <html> when Light mode is selected", () => {
    mount();
    cy.get('[aria-label="Dark mode"]').click();
    cy.get("html").should("have.class", "dark");
    cy.get('[aria-label="Light mode"]').click();
    cy.get("html").should("not.have.class", "dark");
  });

  /* ── Navbar variant ───────────────────────────────────────────── */
  it("renders the navbar variant without errors", () => {
    mount("navbar");
    cy.get('[role="group"]').should("be.visible");
  });

  /* ── Accessibility ────────────────────────────────────────────── */
  it("all buttons have accessible aria-label attributes", () => {
    mount();
    cy.get('[role="group"] button').each(($btn) => {
      assert.isNotEmpty($btn.attr("aria-label") ?? "", "aria-label should not be empty");
    });
  });

  it("all buttons have an aria-pressed attribute set to true or false", () => {
    mount();
    cy.get('[role="group"] button').each(($btn) => {
      const pressed = $btn.attr("aria-pressed");
      assert.include(["true", "false"], pressed, `aria-pressed must be "true" or "false"`);
    });
  });
});
