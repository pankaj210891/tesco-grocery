/// <reference types="cypress" />

/*
 * E2E — Products
 * Tests the product listing page, search, filtering, sorting, and
 * the product detail page.  API calls are intercepted.
 */

describe("Products — Listing Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          products: [
            {
              _id: "prod001",
              name: "Organic Full-Fat Milk 2L",
              slug: "organic-full-fat-milk-2l",
              price: 1.89,
              originalPrice: 2.29,
              images: ["/images/placeholder.webp"],
              category: { _id: "cat001", name: "Fresh Food", slug: "fresh-food" },
              brand: "Lakeland Dairy",
              stock: 50,
              rating: 4.5,
              reviewCount: 120,
              badge: "sale",
              isActive: true,
            },
            {
              _id: "prod002",
              name: "Sourdough Loaf 800g",
              slug: "sourdough-loaf-800g",
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
          ],
          total: 2,
          page: 1,
          totalPages: 1,
          limit: 12,
        },
      },
    }).as("getProducts");

    cy.intercept("GET", "/api/categories*", {
      statusCode: 200,
      body: {
        success: true,
        data: [
          { _id: "cat001", name: "Fresh Food", slug: "fresh-food" },
          { _id: "cat002", name: "Bakery", slug: "bakery" },
        ],
      },
    }).as("getCategories");

    cy.visit("/products");
  });

  /* ── Page structure ───────────────────────────────────────────── */
  it("renders the products page heading", () => {
    cy.get("h1, h2").should("exist");
  });

  it("displays a product card for each returned product", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
    cy.contains("Sourdough Loaf 800g").should("be.visible");
  });

  it("shows prices on product cards", () => {
    cy.contains("£1.89").should("exist");
    cy.contains("£2.50").should("exist");
  });

  it("shows the Sale badge on discounted products", () => {
    cy.contains("Sale").should("be.visible");
  });

  /* ── Search ───────────────────────────────────────────────────── */
  it("updates the URL query string when searching from the navbar", () => {
    cy.get('[role="search"]').within(() => {
      cy.get('input[type="text"]').type("bread");
      cy.get('[type="submit"]').click();
    });
    cy.url().should("include", "q=bread");
  });

  /* ── Sort control ─────────────────────────────────────────────── */
  it("renders the sort control", () => {
    cy.get("select, [role='combobox']").should("exist");
  });

  /* ── Filters sidebar ──────────────────────────────────────────── */
  it("renders the filters sidebar on desktop", () => {
    cy.viewport(1280, 800);
    /* The sidebar contains price range or category headings */
    cy.contains(/filter|category|price/i).should("exist");
  });

  it("shows the mobile filters button on small screens", () => {
    cy.viewport(375, 812);
    cy.contains(/filter/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Products — Detail Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/products/organic-full-fat-milk-2l", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id: "prod001",
          name: "Organic Full-Fat Milk 2L",
          slug: "organic-full-fat-milk-2l",
          description: "Rich, creamy organic full-fat milk.",
          price: 1.89,
          originalPrice: 2.29,
          images: ["/images/placeholder.webp"],
          category: { _id: "cat001", name: "Fresh Food", slug: "fresh-food" },
          brand: "Lakeland Dairy",
          stock: 50,
          rating: 4.5,
          reviewCount: 120,
          badge: "sale",
          isActive: true,
        },
      },
    }).as("getProduct");

    cy.intercept("GET", "/api/reviews*", {
      statusCode: 200,
      body: { success: true, data: { reviews: [], total: 0 } },
    }).as("getReviews");

    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1, limit: 4 } },
    }).as("relatedProducts");

    cy.visit("/products/organic-full-fat-milk-2l");
  });

  it("displays the product name on the detail page", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });

  it("shows the product price", () => {
    cy.contains("£1.89").should("be.visible");
  });

  it("shows an Add to Cart button", () => {
    cy.contains(/add to cart|add to bag/i).should("be.visible");
  });

  it("shows an Add to Wishlist button", () => {
    cy.get('[aria-label*="wishlist"], [aria-label*="Wishlist"]').should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Products — Search Results Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          products: [
            {
              _id: "prod001",
              name: "Organic Full-Fat Milk 2L",
              slug: "organic-full-fat-milk-2l",
              price: 1.89,
              images: ["/images/placeholder.webp"],
              category: { name: "Fresh Food", slug: "fresh-food" },
              stock: 50,
              rating: 4.5,
              reviewCount: 10,
            },
          ],
          total: 1,
          page: 1,
          totalPages: 1,
          limit: 12,
        },
      },
    }).as("searchProducts");

    cy.visit("/search?q=milk");
  });

  it("shows the search query in the heading", () => {
    cy.contains("milk").should("exist");
  });

  it("displays a result matching the query", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });
});
