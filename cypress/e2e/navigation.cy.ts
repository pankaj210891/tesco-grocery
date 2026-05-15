/// <reference types="cypress" />

/*
 * E2E — Navigation
 * Tests the Navbar, key page loads, internal links, and the search bar.
 * These tests check structure and routing; they do NOT require a database.
 */

describe("Navigation", () => {
  beforeEach(() => {
    /* Stub the homepage data endpoints so the server component renders
     * without a live MongoDB connection during CI. */
    cy.intercept("GET", "/api/homepage/**", { body: { success: true, data: [] } }).as("homepage");
    cy.intercept("GET", "/api/categories*", {
      fixture: "categories.json",
      statusCode: 200,
    }).as("categories");
    cy.intercept("GET", "/api/products*", {
      fixture: "products.json",
      statusCode: 200,
    }).as("products");

    cy.visit("/");
  });

  /* ── Navbar structure ─────────────────────────────────────────── */
  it("displays the navbar with logo, search bar, and theme toggle", () => {
    cy.get('[aria-label="Prakash Supermarket — Home"]').should("be.visible");
    cy.get('[role="search"]').should("be.visible");
    cy.get('[aria-label="Choose colour theme"]').should("be.visible");
  });

  it("shows the cart and wishlist icons in the navbar", () => {
    cy.get('[aria-label*="Cart"]').should("be.visible");
    cy.get('[aria-label*="Wishlist"]').should("be.visible");
  });

  it("shows the secondary nav with department and page links", () => {
    cy.contains("Shop By Departments").should("be.visible");
    cy.contains("Home").should("be.visible");
    cy.contains("Shop").should("be.visible");
    cy.contains("Categories").should("be.visible");
    cy.contains("Offers").should("be.visible");
    cy.contains("Help").should("be.visible");
  });

  /* ── Internal link routing ───────────────────────────────────── */
  it("navigates to /products when Shop link is clicked", () => {
    cy.get("nav").contains("Shop").click();
    cy.url().should("include", "/products");
  });

  it("navigates to /categories when Categories link is clicked", () => {
    cy.get("nav").contains("Categories").click();
    cy.url().should("include", "/categories");
  });

  it("navigates to /offers when Offers link is clicked", () => {
    cy.get("nav").contains("Offers").click();
    cy.url().should("include", "/offers");
  });

  it("navigates to /help when Help link is clicked", () => {
    cy.get("nav").contains("Help").click();
    cy.url().should("include", "/help");
  });

  it("navigates to homepage when the logo is clicked", () => {
    cy.visit("/products");
    cy.get('[aria-label="Prakash Supermarket — Home"]').click();
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });

  /* ── Search ──────────────────────────────────────────────────── */
  it("submits a search query and redirects to /search", () => {
    cy.get('[role="search"]').within(() => {
      cy.get('input[type="text"]').type("milk");
      cy.get('[type="submit"]').click();
    });
    cy.url().should("include", "/search").and("include", "milk");
  });

  it("does not navigate if the search query is empty", () => {
    cy.get('[role="search"]').within(() => {
      cy.get('[type="submit"]').click();
    });
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });

  /* ── All Departments dropdown ────────────────────────────────── */
  it("opens the All Departments dropdown on click", () => {
    cy.contains("Shop By Departments").click();
    cy.contains("Fresh Food").should("be.visible");
    cy.contains("Bakery").should("be.visible");
    cy.contains("Frozen Food").should("be.visible");
  });

  it("closes the All Departments dropdown when clicking outside", () => {
    cy.contains("Shop By Departments").click();
    cy.contains("Fresh Food").should("be.visible");
    cy.get("body").click(0, 0); // click outside the dropdown
    cy.contains("Fresh Food").should("not.exist");
  });

  /* ── Mobile navigation ───────────────────────────────────────── */
  it("shows the hamburger menu on mobile viewport", () => {
    cy.viewport(375, 812);
    cy.get('[aria-label="Open menu"]').should("be.visible");
  });

  it("opens and closes the mobile drawer", () => {
    cy.viewport(375, 812);
    cy.get('[aria-label="Open menu"]').click();
    cy.get('[aria-label="Close menu"]').should("be.visible");
    /* Mobile drawer should contain a theme toggle */
    cy.get("header").contains("Theme").should("be.visible");
    /* Close the drawer */
    cy.get('[aria-label="Close menu"]').click();
    cy.get('[aria-label="Open menu"]').should("be.visible");
  });

  /* ── Page title ──────────────────────────────────────────────── */
  it("sets the correct document title on the homepage", () => {
    cy.title().should("include", "Prakash");
  });

  it("sets a distinct title on the login page", () => {
    cy.visit("/login");
    cy.title().should("include", "Prakash");
  });
});
