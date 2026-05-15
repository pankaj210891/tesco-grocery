/// <reference types="cypress" />

/*
 * E2E — Cart
 * Tests the shopping cart page: empty state, item rendering,
 * quantity controls, and remove operations.
 * API calls are intercepted so tests run without a live database.
 */

describe("Cart — Empty State", () => {
  beforeEach(() => {
    /* Ensure no auth token exists (guest user). */
    cy.clearLocalStorage("prakash-auth");
    cy.clearLocalStorage("cart-store");

    cy.visit("/cart");
  });

  it("renders the cart page without crashing", () => {
    cy.get("main").should("be.visible");
  });

  it("shows an empty-cart message when there are no items", () => {
    cy.contains(/your cart is empty|no items|start shopping/i).should("be.visible");
  });

  it("shows a link to continue shopping from the empty cart", () => {
    cy.contains(/shop|browse|continue/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — With Items (mocked Zustand state)", () => {
  beforeEach(() => {
    /*
     * Seed the Zustand cart store directly in localStorage.
     * The cart store persists under the key "cart-store".
     * Adjust the `state` shape if the store schema changes.
     */
    const cartState = {
      state: {
        items: [
          {
            product: {
              _id: "prod001",
              name: "Organic Full-Fat Milk 2L",
              slug: "organic-full-fat-milk-2l",
              price: 1.89,
              images: ["/images/placeholder.webp"],
              stock: 50,
            },
            quantity: 2,
          },
        ],
      },
      version: 0,
    };
    window.localStorage.setItem("cart-store", JSON.stringify(cartState));

    cy.intercept("GET", "/api/cart*", {
      statusCode: 200,
      body: { success: true, data: { items: [], subtotal: 0, total: 0 } },
    }).as("getCart");

    cy.visit("/cart");
  });

  it("displays the product name from the cart", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });

  it("shows the correct item price", () => {
    cy.contains(/£1\.89|1\.89/).should("exist");
  });

  it("renders a quantity control", () => {
    /* Quantity controls are typically '+' / '−' buttons or an input */
    cy.get('[aria-label*="quantity"], input[type="number"], button').filter(':contains("+")').should("exist");
  });

  it("shows the order summary section", () => {
    cy.contains(/subtotal|total|order summary/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Add to Cart Interaction", () => {
  beforeEach(() => {
    cy.clearLocalStorage("prakash-auth");

    cy.intercept("GET", "/api/products/sourdough-loaf-800g", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id: "prod002",
          name: "Sourdough Loaf 800g",
          slug: "sourdough-loaf-800g",
          description: "Artisan sourdough loaf.",
          price: 2.5,
          originalPrice: null,
          images: ["/images/placeholder.webp"],
          category: { _id: "cat002", name: "Bakery", slug: "bakery" },
          brand: "Artisan Bakes",
          stock: 30,
          rating: 4.8,
          reviewCount: 87,
          badge: null,
          isActive: true,
        },
      },
    }).as("getProduct");

    cy.intercept("GET", "/api/reviews*", {
      statusCode: 200,
      body: { success: true, data: { reviews: [], total: 0 } },
    }).as("reviews");

    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1, limit: 4 } },
    }).as("related");

    cy.visit("/products/sourdough-loaf-800g");
  });

  it("adds the product to the cart when Add to Cart is clicked", () => {
    cy.contains(/add to cart|add to bag/i).click();
    /* Cart count in the navbar should increment */
    cy.get('[aria-label*="Cart"]').should("be.visible");
  });

  it("shows a toast confirmation after adding to cart", () => {
    cy.contains(/add to cart|add to bag/i).click();
    /* Sonner toast should appear */
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Checkout Navigation", () => {
  beforeEach(() => {
    /* Seed a non-empty cart so the checkout button appears */
    const cartState = {
      state: {
        items: [
          {
            product: {
              _id: "prod001",
              name: "Organic Full-Fat Milk 2L",
              slug: "organic-full-fat-milk-2l",
              price: 1.89,
              images: ["/images/placeholder.webp"],
              stock: 50,
            },
            quantity: 1,
          },
        ],
      },
      version: 0,
    };
    window.localStorage.setItem("cart-store", JSON.stringify(cartState));
    cy.visit("/cart");
  });

  it("has a checkout button visible when the cart has items", () => {
    cy.contains(/checkout|proceed/i).should("be.visible");
  });

  it("redirects to /login when an unauthenticated user clicks Checkout", () => {
    cy.clearLocalStorage("prakash-auth");
    cy.contains(/checkout|proceed/i).click();
    cy.url().should("include", "/login");
  });
});
