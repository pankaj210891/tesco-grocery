/// <reference types="cypress" />

/*
 * E2E — Admin Inventory Management
 * Tests the /admin/inventory page: listing products, filtering,
 * editing stock quantities, and bulk save via the PATCH API.
 * All API calls are intercepted so tests run without a live database.
 */

// ── Mock data ────────────────────────────────────────────────────────────────

const mockProducts = [
  {
    _id:               "prod001",
    name:              "Organic Full-Fat Milk 2L",
    slug:              "organic-full-fat-milk-2l",
    category:          "Dairy",
    brand:             "Amul",
    inStock:           true,
    stockQuantity:     50,
    lowStockThreshold: 5,
  },
  {
    _id:               "prod002",
    name:              "Sourdough Loaf 800g",
    slug:              "sourdough-loaf-800g",
    category:          "Bakery",
    brand:             "Artisan Bakes",
    inStock:           true,
    stockQuantity:     3,
    lowStockThreshold: 5,
  },
  {
    _id:               "prod003",
    name:              "Greek Yogurt 500g",
    slug:              "greek-yogurt-500g",
    category:          "Dairy",
    brand:             "Mother Dairy",
    inStock:           false,
    stockQuantity:     0,
    lowStockThreshold: 5,
  },
  {
    _id:               "prod004",
    name:              "Basmati Rice 5kg",
    slug:              "basmati-rice-5kg",
    category:          "Grains",
    brand:             "India Gate",
    inStock:           true,
    stockQuantity:     null,
    lowStockThreshold: 5,
  },
];

const mockInventoryResponse = {
  success: true,
  data: {
    products:   mockProducts,
    total:      mockProducts.length,
    page:       1,
    totalPages: 1,
  },
};

const lowStockProducts = mockProducts.filter(
  (p) => p.stockQuantity !== null && p.stockQuantity <= p.lowStockThreshold
);

function loginAdmin() {
  cy.loginByApi(
    Cypress.env("TEST_ADMIN_EMAIL") ?? "admin@example.com",
    Cypress.env("TEST_ADMIN_PASSWORD") ?? "AdminPass1",
  );
}

function interceptInventoryGet(products = mockProducts) {
  cy.intercept("GET", "/api/admin/inventory*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        products,
        total:      products.length,
        page:       1,
        totalPages: 1,
      },
    },
  }).as("getInventory");
}

// ── Seed admin user before suite ─────────────────────────────────────────────
before(() => {
  cy.task("seedTestUser", {
    email:    Cypress.env("TEST_ADMIN_EMAIL") ?? "admin@example.com",
    password: Cypress.env("TEST_ADMIN_PASSWORD") ?? "AdminPass1",
    name:     "Admin User",
    role:     "admin",
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Page Rendering", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("renders the inventory management page", () => {
    cy.get('[data-testid="admin-inventory-page"]').should("be.visible");
  });

  it("shows the Inventory Management heading", () => {
    cy.contains(/inventory management/i).should("be.visible");
  });

  it("shows the product count in the heading", () => {
    cy.contains(String(mockProducts.length)).should("be.visible");
  });

  it("renders the inventory table", () => {
    cy.get('[data-testid="inventory-table"]').should("be.visible");
  });

  it("shows all product names in the table", () => {
    mockProducts.forEach((p) => {
      cy.contains(p.name).should("be.visible");
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Stock Status Labels", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("shows 'In Stock' badge for products with stock", () => {
    cy.contains("In Stock").should("be.visible");
  });

  it("shows 'Out of Stock' badge for products with stockQuantity = 0", () => {
    cy.contains("Out of Stock").should("be.visible");
  });

  it("shows 'Untracked' for products with null stockQuantity", () => {
    cy.contains("Untracked").should("be.visible");
  });

  it("shows low stock indicator for products below threshold", () => {
    cy.contains(/low \(\d+\)/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Search Filter", () => {
  it("filters products by search query", () => {
    // Register the generic intercept first, then the specific one last.
    // Cypress uses the LAST matching intercept, so the search-specific
    // route wins for requests that include search=Milk.
    cy.intercept("GET", "/api/admin/inventory*", { body: mockInventoryResponse }).as("initial");
    cy.intercept("GET", "/api/admin/inventory*search=Milk*", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          products:   [mockProducts[0]],
          total:      1,
          page:       1,
          totalPages: 1,
        },
      },
    }).as("searchInventory");

    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@initial");

    cy.get('[data-testid="inventory-search"]').type("Milk");
    cy.wait("@searchInventory");
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Low Stock Filter", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("renders the low-stock filter checkbox", () => {
    cy.get('[data-testid="inventory-low-stock-filter"]').should("be.visible");
  });

  it("filters to low-stock products when checkbox is checked", () => {
    cy.intercept("GET", "/api/admin/inventory*lowStock=true*", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          products:   lowStockProducts,
          total:      lowStockProducts.length,
          page:       1,
          totalPages: 1,
        },
      },
    }).as("getLowStock");

    cy.get('[data-testid="inventory-low-stock-filter"]').check();
    cy.wait("@getLowStock");
    cy.contains("Sourdough Loaf 800g").should("be.visible");
    cy.contains("Organic Full-Fat Milk 2L").should("not.exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Editing Stock", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("renders a stock input field for each product", () => {
    cy.get('[data-testid^="stock-input-"]').should("have.length", mockProducts.length);
  });

  it("renders a threshold input field for each product", () => {
    cy.get('[data-testid^="threshold-input-"]').should("have.length", mockProducts.length);
  });

  it("shows the Save button when a stock value is entered", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get('[data-testid="inventory-save"]').should("be.visible");
  });

  it("Save button shows the count of dirty changes", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get(`[data-testid="stock-input-${mockProducts[1]._id}"]`).type("50");
    cy.get('[data-testid="inventory-save"]').should("contain.text", "2");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Saving Stock Updates", () => {
  beforeEach(() => {
    interceptInventoryGet();

    cy.intercept("PATCH", "/api/admin/inventory", {
      statusCode: 200,
      body: { success: true, message: "Updated 1 product(s)" },
    }).as("patchInventory");

    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("calls PATCH /api/admin/inventory when Save is clicked", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get('[data-testid="inventory-save"]').click();
    cy.wait("@patchInventory");
  });

  it("sends the correct payload with productId and stockQuantity", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get('[data-testid="inventory-save"]').click();
    cy.wait("@patchInventory").then((interception) => {
      const { updates } = interception.request.body;
      expect(updates).to.have.length(1);
      expect(updates[0]).to.deep.include({
        productId:     mockProducts[0]._id,
        stockQuantity: 100,
      });
    });
  });

  it("shows a success toast after saving", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get('[data-testid="inventory-save"]').click();
    cy.wait("@patchInventory");
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });

  it("hides the Save button after successful save (no dirty rows)", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get('[data-testid="inventory-save"]').click();
    cy.wait("@patchInventory");
    // After refetch, edits are cleared and Save button disappears
    cy.wait("@getInventory");
    cy.get('[data-testid="inventory-save"]').should("not.exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Error Handling", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("shows an error toast when the PATCH API fails", () => {
    cy.intercept("PATCH", "/api/admin/inventory", {
      statusCode: 500,
      body: { success: false, error: "Internal server error" },
    }).as("patchFail");

    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("999");
    cy.get('[data-testid="inventory-save"]').click();
    cy.wait("@patchFail");
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Refresh Button", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("renders the refresh button", () => {
    cy.get('[data-testid="inventory-refresh"]').should("be.visible");
  });

  it("re-fetches inventory when the refresh button is clicked", () => {
    cy.get('[data-testid="inventory-refresh"]').click();
    cy.wait("@getInventory");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Empty State", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/inventory*", {
      statusCode: 200,
      body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1 } },
    }).as("getEmpty");

    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getEmpty");
  });

  it("shows an empty state when no products are found", () => {
    cy.get('[data-testid="inventory-empty"]').should("be.visible");
    cy.contains(/no products found/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Access Control", () => {
  it("redirects non-admin users away from the inventory page", () => {
    cy.loginByApi(Cypress.env("TEST_USER_EMAIL"), Cypress.env("TEST_USER_PASSWORD"));
    cy.visit("/admin/inventory");
    cy.url().should("not.include", "/admin/inventory");
  });

  it("redirects unauthenticated users away from the inventory page", () => {
    cy.visit("/admin/inventory");
    cy.url().should("include", "/login");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Mobile Responsiveness", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.viewport("iphone-x");
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("renders the inventory page on mobile without crashing", () => {
    cy.get('[data-testid="admin-inventory-page"]').should("be.visible");
  });

  it("shows the Inventory Management heading on mobile", () => {
    cy.contains(/inventory management/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Bulk Stock Update", () => {
  beforeEach(() => {
    interceptInventoryGet();

    cy.intercept("PATCH", "/api/admin/inventory", {
      statusCode: 200,
      body: { success: true, message: "Updated 3 product(s)" },
    }).as("bulkPatch");

    loginAdmin();
    cy.visit("/admin/inventory");
    cy.wait("@getInventory");
  });

  it("allows updating multiple products in a single save", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get(`[data-testid="stock-input-${mockProducts[1]._id}"]`).type("30");
    cy.get(`[data-testid="threshold-input-${mockProducts[2]._id}"]`).type("10");
    cy.get('[data-testid="inventory-save"]').click();

    cy.wait("@bulkPatch").then((interception) => {
      const { updates } = interception.request.body;
      expect(updates.length).to.be.gte(2);
    });
  });

  it("shows the correct dirty count before saving", () => {
    cy.get(`[data-testid="stock-input-${mockProducts[0]._id}"]`).type("100");
    cy.get(`[data-testid="stock-input-${mockProducts[1]._id}"]`).type("30");
    cy.get(`[data-testid="threshold-input-${mockProducts[2]._id}"]`).type("10");
    cy.get('[data-testid="inventory-save"]').should("contain.text", "3");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Admin Inventory — Sidebar Navigation", () => {
  beforeEach(() => {
    interceptInventoryGet();
    loginAdmin();
    cy.visit("/admin");
  });

  it("shows the Inventory link in the admin sidebar", () => {
    cy.contains("a", /inventory/i).should("be.visible");
  });

  it("navigates to /admin/inventory when the Inventory link is clicked", () => {
    cy.intercept("GET", "/api/admin/inventory*", { body: mockInventoryResponse });
    cy.contains("a", /inventory/i).click();
    cy.url().should("include", "/admin/inventory");
  });
});
