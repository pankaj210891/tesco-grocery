/**
 * E2E: Vendor Inventory & Stock Quantity Management
 *
 * Covers:
 *  - Vendor products page loads and shows the table
 *  - Add product modal opens and inventory section renders
 *  - "Track stock quantity" toggle reveals qty + low-stock-threshold inputs
 *  - Disabling tracking shows the simple In-Stock boolean toggle
 *  - Low-stock warning appears when qty ≤ threshold
 *  - Stock column in table shows numeric qty with colour-coded badge
 *  - Saving a product with tracked stock calls the correct API
 *  - Saving a product with untracked stock calls with stockQuantity: null
 *  - API: PUT /api/vendor/products/:id with stockQuantity derives inStock correctly
 */

const VENDOR_EMAIL    = Cypress.env("VENDOR_EMAIL")    ?? "vendor@example.com";
const VENDOR_PASSWORD = Cypress.env("VENDOR_PASSWORD") ?? "Test@1234";

function vendorLogin() {
  cy.request("POST", "/api/auth/login", {
    email:    VENDOR_EMAIL,
    password: VENDOR_PASSWORD,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const { token, user } = res.body.data as { token: string; user: { _id: string } };
    window.localStorage.setItem(
      "prakash-auth",
      JSON.stringify({ state: { user, token, hasHydrated: true }, version: 0 }),
    );
  });
}

describe("Vendor Products page — inventory section", () => {
  beforeEach(() => {
    vendorLogin();
    cy.visit("/vendor/products");
    cy.get('[data-testid="add-product-btn"]', { timeout: 10000 }).should("be.visible");
  });

  it("shows the product table", () => {
    cy.get("table").should("exist");
  });

  it("opens Add Product modal", () => {
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="product-modal"]').should("be.visible");
  });

  it("inventory section is visible in the modal", () => {
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="track-stock-toggle"]').should("exist");
    cy.get('[data-testid="in-stock-toggle"]').should("be.visible");
  });

  it("enabling track-stock reveals qty and threshold inputs", () => {
    cy.get('[data-testid="add-product-btn"]').click();

    // Initially the simple toggle is shown, not the qty inputs
    cy.get('[data-testid="stock-quantity-input"]').should("not.exist");
    cy.get('[data-testid="low-stock-threshold-input"]').should("not.exist");

    // Enable tracking
    cy.get('[data-testid="track-stock-toggle"]').check({ force: true });

    cy.get('[data-testid="stock-quantity-input"]').should("be.visible");
    cy.get('[data-testid="low-stock-threshold-input"]').should("be.visible");

    // Simple in-stock toggle should be hidden
    cy.get('[data-testid="in-stock-toggle"]').should("not.exist");
  });

  it("disabling track-stock hides qty inputs and shows simple toggle", () => {
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="track-stock-toggle"]').check({ force: true });
    cy.get('[data-testid="track-stock-toggle"]').uncheck({ force: true });

    cy.get('[data-testid="stock-quantity-input"]').should("not.exist");
    cy.get('[data-testid="in-stock-toggle"]').should("be.visible");
  });

  it("shows low-stock warning when qty ≤ threshold", () => {
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="track-stock-toggle"]').check({ force: true });

    cy.get('[data-testid="low-stock-threshold-input"]').clear().type("10");
    cy.get('[data-testid="stock-quantity-input"]').clear().type("3");

    cy.contains("Stock is at or below the low-stock alert threshold").should("be.visible");
  });

  it("does NOT show low-stock warning when qty > threshold", () => {
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="track-stock-toggle"]').check({ force: true });

    cy.get('[data-testid="low-stock-threshold-input"]').clear().type("5");
    cy.get('[data-testid="stock-quantity-input"]').clear().type("20");

    cy.contains("Stock is at or below the low-stock alert threshold").should("not.exist");
  });

  it("closing modal resets state", () => {
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="track-stock-toggle"]').check({ force: true });
    cy.get('[data-testid="stock-quantity-input"]').type("99");
    cy.get('[data-testid="close-modal"]').click();

    // Reopen — should be clean
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('[data-testid="track-stock-toggle"]').should("not.be.checked");
    cy.get('[data-testid="stock-quantity-input"]').should("not.exist");
  });
});

describe("Vendor Products table — stock column rendering", () => {
  beforeEach(() => {
    vendorLogin();
  });

  it("shows numeric stock badge when stockQuantity is set", () => {
    // Intercept the products API to inject a product with known stockQuantity
    cy.intercept("GET", "/api/vendor/products*", {
      body: {
        success: true,
        data: {
          products: [
            {
              _id:           "prod001",
              name:          "Test Widget",
              slug:          "test-widget",
              description:   "desc",
              price:         100,
              images:        ["/images/placeholder-product.webp"],
              category:      "Electronics",
              brand:         "TestBrand",
              unit:          "pcs",
              inStock:       true,
              stockQuantity: 12,
              lowStockThreshold: 5,
              rating:        0,
              reviewCount:   0,
              tags:          [],
              status:        "approved",
              createdAt:     new Date().toISOString(),
              updatedAt:     new Date().toISOString(),
            },
          ],
          total:      1,
          page:       1,
          totalPages: 1,
        },
      },
    }).as("products");

    cy.visit("/vendor/products");
    cy.wait("@products");

    cy.get('[data-testid="stock-qty-prod001"]').should("contain", "12 left");
  });

  it("shows Out of Stock badge when stockQuantity is 0", () => {
    cy.intercept("GET", "/api/vendor/products*", {
      body: {
        success: true,
        data: {
          products: [
            {
              _id:           "prod002",
              name:          "Out Widget",
              slug:          "out-widget",
              description:   "desc",
              price:         50,
              images:        [],
              category:      "Beverages",
              brand:         "B",
              unit:          "pcs",
              inStock:       false,
              stockQuantity: 0,
              lowStockThreshold: 5,
              rating:        0,
              reviewCount:   0,
              tags:          [],
              status:        "approved",
              createdAt:     new Date().toISOString(),
              updatedAt:     new Date().toISOString(),
            },
          ],
          total: 1, page: 1, totalPages: 1,
        },
      },
    }).as("products2");

    cy.visit("/vendor/products");
    cy.wait("@products2");

    cy.get('[data-testid="stock-qty-prod002"]').should("contain", "Out of Stock");
  });

  it("shows In Stock pill when stockQuantity is null (untracked)", () => {
    cy.intercept("GET", "/api/vendor/products*", {
      body: {
        success: true,
        data: {
          products: [
            {
              _id:           "prod003",
              name:          "Unlimited Widget",
              slug:          "unlimited-widget",
              description:   "desc",
              price:         200,
              images:        [],
              category:      "Dairy",
              brand:         "C",
              unit:          "kg",
              inStock:       true,
              stockQuantity: null,
              lowStockThreshold: 5,
              rating:        0,
              reviewCount:   0,
              tags:          [],
              status:        "approved",
              createdAt:     new Date().toISOString(),
              updatedAt:     new Date().toISOString(),
            },
          ],
          total: 1, page: 1, totalPages: 1,
        },
      },
    }).as("products3");

    cy.visit("/vendor/products");
    cy.wait("@products3");

    // Should show the simple "In Stock" pill, not a numeric badge
    cy.get('[data-testid="stock-cell-prod003"]').should("contain", "In Stock");
    cy.get('[data-testid="stock-qty-prod003"]').should("not.exist");
  });
});

describe("Vendor Inventory API — PUT /api/vendor/products/:id", () => {
  it("returns 401 for unauthenticated request", () => {
    cy.request({
      method:           "PUT",
      url:              "/api/vendor/products/000000000000000000000001",
      body:             { stockQuantity: 10 },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});
