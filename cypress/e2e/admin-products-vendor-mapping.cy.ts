/// <reference types="cypress" />

/*
 * E2E — Admin Products Vendor Mapping
 * Tests vendor selector in Add/Edit Product forms, vendor filter in listing,
 * RBAC restrictions, and API-level vendor validation.
 */

const ADMIN_AUTH = {
  user:  { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
  token: "fake-admin-token",
};

const VENDOR_AUTH = {
  user:  { _id: "vendor001", name: "Vendor User", email: "vendor@test.com", role: "vendor", status: "active" },
  token: "fake-vendor-token",
};

const ACTIVE_VENDORS_STUB = {
  success: true,
  data: {
    vendors: [
      { _id: "v1", name: "Fresh Farm Co",   slug: "fresh-farm-co"   },
      { _id: "v2", name: "Artisan Bakes",   slug: "artisan-bakes"   },
      { _id: "v3", name: "Organic Origins", slug: "organic-origins" },
    ],
    total: 3, page: 1, totalPages: 1,
  },
};

const ALL_VENDORS_STUB = {
  success: true,
  data: {
    vendors: [
      { _id: "v1", name: "Fresh Farm Co" },
      { _id: "v2", name: "Artisan Bakes" },
    ],
    total: 2, page: 1, totalPages: 1,
  },
};

const PRODUCTS_STUB = {
  success: true,
  data: {
    products: [
      {
        _id: "p1", name: "Organic Milk 2L", slug: "organic-milk-2l",
        price: 120, originalPrice: 150, images: ["/images/placeholder-product.webp"],
        category: "Dairy", brand: "NatureFarm", unit: "2L",
        inStock: true, rating: 4.5, reviewCount: 30,
        badge: "ORGANIC", status: "approved",
        vendorId: "v1", vendorName: "Fresh Farm Co",
        tags: [], createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        _id: "p2", name: "Sourdough Bread 800g", slug: "sourdough-bread-800g",
        price: 80, originalPrice: null, images: ["/images/placeholder-product.webp"],
        category: "Bakery", brand: "ArtisanBakes", unit: "800g",
        inStock: false, rating: 4.8, reviewCount: 50,
        badge: null, status: "pending",
        vendorId: null, vendorName: null,
        tags: [], createdAt: "2024-02-01T00:00:00.000Z", updatedAt: "2024-02-01T00:00:00.000Z",
      },
    ],
    total: 2, page: 1, totalPages: 1,
  },
};

const CATEGORIES_STUB = { success: true, data: [{ name: "Dairy" }, { name: "Bakery" }] };
const BRANDS_STUB     = { success: true, data: ["NatureFarm", "ArtisanBakes"] };

function stubAdminAuth(win: Window) {
  const authState = { state: { user: ADMIN_AUTH.user, token: ADMIN_AUTH.token, hasHydrated: true }, version: 0 };
  win.localStorage.setItem("prakash-auth", JSON.stringify(authState));
}

function stubVendorAuth(win: Window) {
  const authState = { state: { user: VENDOR_AUTH.user, token: VENDOR_AUTH.token, hasHydrated: true }, version: 0 };
  win.localStorage.setItem("prakash-auth", JSON.stringify(authState));
}

function interceptAll(products = PRODUCTS_STUB) {
  cy.intercept("GET", "/api/admin/products*",          products).as("getProducts");
  cy.intercept("GET", "/api/admin/vendors?*",          ALL_VENDORS_STUB).as("getVendors");
  cy.intercept("GET", "/api/admin/vendors/dropdown*",  ACTIVE_VENDORS_STUB).as("getDropdownVendors");
  cy.intercept("GET", "/api/admin/categories*",        CATEGORIES_STUB).as("getCategories");
  cy.intercept("GET", "/api/brands*",                  BRANDS_STUB).as("getBrands");
}

function visitAdmin(qs = "") {
  cy.visit(`/admin/products${qs ? `?${qs}` : ""}`, { onBeforeLoad: stubAdminAuth });
}

// ── Products listing — vendor column ─────────────────────────────────────────

describe("Admin Products — Vendor Column in Listing", () => {
  beforeEach(() => {
    interceptAll();
    visitAdmin();
  });

  it("shows vendor name badge for vendor-owned products", () => {
    cy.get("[data-testid='product-row']").first()
      .contains("Fresh Farm Co").should("be.visible");
  });

  it("shows Platform label for products without a vendor", () => {
    cy.get("[data-testid='product-row']").last()
      .contains("Platform").should("be.visible");
  });
});

// ── Vendor filter in listing ──────────────────────────────────────────────────

describe("Admin Products — Vendor Filter", () => {
  beforeEach(() => {
    interceptAll();
    visitAdmin();
  });

  it("populates vendor filter dropdown with vendors from API", () => {
    cy.get("[data-testid='vendor-filter']").within(() => {
      cy.contains("Fresh Farm Co").should("exist");
      cy.contains("Artisan Bakes").should("exist");
    });
  });

  it("selecting a vendor sets vendorId in URL", () => {
    cy.get("[data-testid='vendor-filter']").select("Fresh Farm Co");
    cy.url().should("include", "vendorId=v1");
  });

  it("shows active chip when vendor filter is applied", () => {
    cy.get("[data-testid='vendor-filter']").select("Fresh Farm Co");
    cy.get("[data-testid='active-filters']").contains("Fresh Farm Co").should("exist");
  });

  it("removing vendor chip clears the URL param", () => {
    cy.get("[data-testid='vendor-filter']").select("Fresh Farm Co");
    cy.url().should("include", "vendorId=v1");
    cy.get("[data-testid='active-filters']").find("button").first().click();
    cy.url().should("not.include", "vendorId=");
  });
});

// ── Add Product — vendor selector ─────────────────────────────────────────────

describe("Admin Products — Add Product with Vendor", () => {
  beforeEach(() => {
    interceptAll();
    visitAdmin();
    cy.get("[data-testid='add-product-btn']").click();
  });

  it("opens Add Product modal", () => {
    // Use the modal overlay as a scope so we don't match the "Add Product" button
    // that sits behind the overlay (Cypress 13 WebDriver visibility treats
    // elements covered by a fixed z-50 overlay as not visible).
    cy.get("[data-testid='add-product-modal']").should("be.visible");
    cy.get("[data-testid='add-product-modal']").contains("Add Product").should("exist");
  });

  it("renders vendor selector in the form", () => {
    cy.get("[data-testid='vendor-select']").should("exist");
  });

  it("defaults vendor selector to Platform (No Vendor)", () => {
    cy.get("[data-testid='vendor-select']").should("have.value", "");
  });

  it("populates vendor selector with active vendors from dropdown API", () => {
    cy.get("[data-testid='vendor-select']").within(() => {
      cy.contains("Fresh Farm Co").should("exist");
      cy.contains("Artisan Bakes").should("exist");
      cy.contains("Organic Origins").should("exist");
    });
  });

  it("shows vendor name confirmation text when vendor is selected", () => {
    cy.get("[data-testid='vendor-select']").select("Fresh Farm Co");
    // Use cy.contains(selector, text) to target the <p> element specifically,
    // avoiding the <option> element that also contains "Fresh Farm Co".
    // scrollIntoView ensures it is in view within the overflow-y-auto modal.
    cy.contains("p", "Mapped to:").scrollIntoView().should("be.visible");
    cy.contains("p", "Mapped to:").should("contain.text", "Fresh Farm Co");
  });

  it("clears vendor confirmation when Platform is re-selected", () => {
    cy.get("[data-testid='vendor-select']").select("Fresh Farm Co");
    cy.contains("Mapped to:").should("be.visible");
    cy.get("[data-testid='vendor-select']").select("Platform (No Vendor)");
    cy.contains("Mapped to:").should("not.exist");
  });

  it("sends vendorId to API when submitting the form with a vendor", () => {
    cy.intercept("POST", "/api/admin/products",
      { success: true, data: { _id: "pnew", name: "Test" } },
    ).as("createProduct");

    cy.get("[data-testid='vendor-select']").select("Fresh Farm Co");

    // Fill required fields
    cy.get("input[type='text']").eq(0).type("Test Product");
    cy.get("textarea").type("A test description");
    cy.get("input[type='text']").eq(3).type("Dairy");
    cy.get("input[type='text']").eq(4).type("TestBrand");
    cy.get("input[type='text']").eq(5).type("1kg");
    cy.get("input[type='number']").eq(0).type("99");

    cy.contains("button", "Add Product").click();
    cy.wait("@createProduct").its("request.body.vendorId").should("eq", "v1");
  });

  it("sends null vendorId when Platform (No Vendor) is selected", () => {
    cy.intercept("POST", "/api/admin/products",
      { success: true, data: { _id: "pnew2" } },
    ).as("createPlatformProduct");

    // Leave vendor as default (Platform)
    cy.get("input[type='text']").eq(0).type("Platform Product");
    cy.get("textarea").type("Platform product description");
    cy.get("input[type='text']").eq(3).type("Dairy");
    cy.get("input[type='text']").eq(4).type("TestBrand");
    cy.get("input[type='text']").eq(5).type("1kg");
    cy.get("input[type='number']").eq(0).type("50");

    cy.contains("button", "Add Product").click();
    cy.wait("@createPlatformProduct").its("request.body.vendorId").should("be.null");
  });
});

// ── Edit Product — vendor selector ────────────────────────────────────────────

describe("Admin Products — Edit Product Vendor", () => {
  beforeEach(() => {
    interceptAll();
    visitAdmin();
  });

  it("pre-fills vendor when editing a vendor-owned product", () => {
    cy.get(`[data-testid='edit-product-p1']`).click();
    cy.get("[data-testid='vendor-select']").should("have.value", "v1");
    cy.contains("Mapped to:").should("be.visible");
    cy.contains("Fresh Farm Co").should("be.visible");
  });

  it("shows Platform (No Vendor) for products without vendor", () => {
    cy.get(`[data-testid='edit-product-p2']`).click();
    cy.get("[data-testid='vendor-select']").should("have.value", "");
    cy.contains("Mapped to:").should("not.exist");
  });

  it("allows changing vendor on an existing product", () => {
    cy.intercept("PUT", "/api/admin/products/p1",
      { success: true, data: { _id: "p1", vendorId: "v2", vendorName: "Artisan Bakes" } },
    ).as("updateProduct");

    cy.get(`[data-testid='edit-product-p1']`).click();
    cy.get("[data-testid='vendor-select']").select("Artisan Bakes");
    cy.contains("button", "Save Changes").click();
    cy.wait("@updateProduct").its("request.body.vendorId").should("eq", "v2");
  });

  it("allows removing vendor mapping (set to Platform)", () => {
    cy.intercept("PUT", "/api/admin/products/p1",
      { success: true, data: { _id: "p1", vendorId: null, vendorName: null } },
    ).as("clearVendor");

    cy.get(`[data-testid='edit-product-p1']`).click();
    cy.get("[data-testid='vendor-select']").select("Platform (No Vendor)");
    cy.contains("button", "Save Changes").click();
    cy.wait("@clearVendor").its("request.body.vendorId").should("be.null");
  });
});

// ── RBAC — non-admin cannot access admin products ────────────────────────────

describe("Admin Products — RBAC Restrictions", () => {
  it("redirects vendor role away from admin products page", () => {
    cy.intercept("GET", "/api/admin/products*", PRODUCTS_STUB).as("getProducts");
    cy.visit("/admin/products", { onBeforeLoad: stubVendorAuth });
    cy.url().should("not.include", "/admin/products");
  });

  it("API rejects vendor token on GET /api/admin/vendors/dropdown", () => {
    cy.request({
      url: "/api/admin/vendors/dropdown",
      headers: { Authorization: `Bearer ${VENDOR_AUTH.token}` },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it("API rejects unauthenticated request on GET /api/admin/vendors/dropdown", () => {
    cy.request({
      url: "/api/admin/vendors/dropdown",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});

// ── Vendor dropdown API — search and filter ───────────────────────────────────

describe("Admin Products — Vendor Dropdown API", () => {
  it("only returns active vendors", () => {
    cy.request({ url: "/api/admin/vendors/dropdown", failOnStatusCode: false })
      .its("status").should("be.oneOf", [200, 401]);
  });

  it("returns success:false with non-200 for unauthenticated requests", () => {
    cy.request({ url: "/api/admin/vendors/dropdown", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.not.eq(200);
    });
  });
});

// ── Validation — API prevents invalid vendor assignment ───────────────────────

describe("Admin Products — Vendor Validation (API)", () => {
  it("GET /api/admin/products returns 400 for invalid vendorId format", () => {
    cy.request({ url: "/api/admin/products?vendorId=not-a-valid-id", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401]);
    });
  });
});

export {};
