/// <reference types="cypress" />

/*
 * E2E — Admin Advanced Filters (Session 2)
 * Tests:
 *   1. AdminDateFilter reusable component (on orders page)
 *   2. Users page — AdminDateFilter integration
 *   3. Products page — dynamic category/brand selects + AdminDateFilter
 *   4. Vendors page — View modal open, edit, save
 *   5. Orders page — userId filter removed
 *   6. Categories page — isActive status filter tabs
 *   7. Promo codes page — status filter tabs (Active/Expired/Inactive)
 */

const ADMIN_AUTH = {
  user:  { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
  token: "fake-admin-token",
};

function stubAuth(win: Window) {
  const s = { state: { user: ADMIN_AUTH.user, token: ADMIN_AUTH.token, hasHydrated: true }, version: 0 };
  win.localStorage.setItem("prakash-auth", JSON.stringify(s));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AdminDateFilter component — via Orders page
// ─────────────────────────────────────────────────────────────────────────────

const ORDERS_STUB = {
  success: true,
  data: {
    orders: [
      {
        _id: "o1", orderNumber: "ORD-001",
        delivery: { fullName: "Alice Smith", email: "alice@test.com" },
        items: [{ productId: "p1", quantity: 2, price: 100, vendorName: "FreshMart" }],
        total: 200, paymentMethod: "cod", status: "pending",
        createdAt: "2025-05-01T10:00:00.000Z", updatedAt: "2025-05-01T10:00:00.000Z",
      },
    ],
    total: 1, page: 1, totalPages: 1,
  },
};

const VENDORS_STUB = {
  success: true,
  data: { vendors: [{ _id: "v1", name: "FreshMart" }], total: 1, page: 1, totalPages: 1 },
};

const VENDOR_DETAIL = {
  _id: "v1", name: "FreshMart", slug: "freshmart", description: "Fresh produce",
  email: "fresh@mart.com", phone: "9876543210", address: "123 Market St",
  city: "Mumbai", status: "active" as const, ownerId: "u1", ownerName: "John Market",
  logo: "", createdAt: "2025-01-01T00:00:00.000Z",
};

describe("AdminDateFilter — Orders Page Integration", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/orders*", ORDERS_STUB).as("getOrders");
    cy.intercept("GET", "/api/admin/vendors*", VENDORS_STUB).as("getVendors");
    cy.visit("/admin/orders", { onBeforeLoad: stubAuth });
    cy.wait("@getOrders");
  });

  it("renders the date filter button", () => {
    cy.get("[data-testid='date-filter-btn']").should("be.visible");
  });

  it("opens date filter dropdown on click", () => {
    cy.get("[data-testid='date-filter-btn']").click();
    cy.contains("Quick select").should("be.visible");
    cy.get("[data-testid='date-preset-today']").should("be.visible");
    cy.get("[data-testid='date-preset-last-7-days']").should("be.visible");
    cy.get("[data-testid='date-preset-last-30-days']").should("be.visible");
    cy.get("[data-testid='date-preset-this-month']").should("be.visible");
  });

  it("applies a preset and fires API call with dateFrom/dateTo", () => {
    cy.intercept("GET", "/api/admin/orders*", (req) => {
      req.reply(ORDERS_STUB);
    }).as("filteredOrders");

    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-preset-today']").click();

    // dropdown should close after preset is applied
    cy.contains("Quick select").should("not.exist");
    // button label changes to show the date range
    cy.get("[data-testid='date-filter-btn']").should("contain", "→");
  });

  it("applies custom date range via Apply button", () => {
    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-from-input']").type("2025-05-01");
    cy.get("[data-testid='date-to-input']").type("2025-05-15");
    cy.get("[data-testid='date-filter-apply']").click();
    cy.get("[data-testid='date-filter-btn']").should("contain", "2025-05-01");
    cy.get("[data-testid='date-filter-btn']").should("contain", "2025-05-15");
  });

  it("clears date filter via Clear button inside dropdown", () => {
    // first apply a preset
    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-preset-today']").click();
    // re-open and clear
    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-filter-clear']").click();
    cy.get("[data-testid='date-filter-btn']").should("contain", "Date filter");
  });

  it("closes date dropdown when clicking outside", () => {
    cy.get("[data-testid='date-filter-btn']").click();
    cy.contains("Quick select").should("be.visible");
    cy.get("h1").click({ force: true });
    cy.contains("Quick select").should("not.exist");
  });

  it("does NOT show userId filter (removed)", () => {
    cy.get("input[placeholder*='user']").should("not.exist");
    cy.get("input[data-testid='order-user-filter']").should("not.exist");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Users Page — AdminDateFilter integration
// ─────────────────────────────────────────────────────────────────────────────

const USERS_STUB = {
  success: true,
  data: {
    users: [
      { _id: "u1", name: "Alice Smith", email: "alice@test.com", role: "customer", status: "active", createdAt: "2025-01-15T00:00:00.000Z" },
      { _id: "u2", name: "Bob Vendor",  email: "bob@test.com",  role: "vendor",   status: "active", createdAt: "2025-02-10T00:00:00.000Z" },
    ],
    total: 2, page: 1, totalPages: 1,
  },
};

describe("Users Page — AdminDateFilter", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/users*", USERS_STUB).as("getUsers");
    cy.visit("/admin/users", { onBeforeLoad: stubAuth });
    cy.wait("@getUsers");
  });

  it("shows AdminDateFilter button (not plain date inputs)", () => {
    cy.get("[data-testid='date-filter-btn']").should("be.visible");
    cy.get("input[data-testid='user-date-from']").should("not.exist");
    cy.get("input[data-testid='user-date-to']").should("not.exist");
  });

  it("date filter label shows Registration date when inactive", () => {
    cy.get("[data-testid='date-filter-btn']").should("contain", "Registration date");
  });

  it("applies date preset and triggers API call", () => {
    cy.intercept("GET", "/api/admin/users*", (req) => {
      expect(req.query).to.have.property("dateFrom");
      req.reply(USERS_STUB);
    }).as("filteredUsers");

    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-preset-last-30-days']").click();
    cy.wait("@filteredUsers");
  });

  it("date chip appears after applying a filter and can be removed", () => {
    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-preset-last-7-days']").click();
    // chip with arrow should appear
    cy.get("[data-testid='active-user-filters']").should("contain", "→");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Products Page — dynamic category/brand + AdminDateFilter
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS_STUB = {
  success: true,
  data: {
    products: [
      {
        _id: "p1", name: "Organic Milk", slug: "organic-milk", price: 120, originalPrice: 150,
        images: ["/images/placeholder-product.webp"], category: "Dairy", subcategory: "Milk",
        brand: "NatureFarm", unit: "2L", inStock: true, rating: 4.5, reviewCount: 30,
        badge: "ORGANIC", status: "approved", vendorName: null,
        createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    total: 1, page: 1, totalPages: 1,
  },
};

const CATEGORIES_STUB = {
  success: true,
  data: [
    { _id: "c1", name: "Dairy", slug: "dairy", emoji: "🥛", isActive: true },
    { _id: "c2", name: "Bakery", slug: "bakery", emoji: "🍞", isActive: true },
    { _id: "c3", name: "Snacks", slug: "snacks", emoji: "🍿", isActive: false },
  ],
};

const BRANDS_STUB = {
  success: true,
  data: ["ArtisanBakes", "NatureFarm", "PureFresh"],
};

describe("Products Page — Dynamic Filters", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/products*", PRODUCTS_STUB).as("getProducts");
    cy.intercept("GET", "/api/admin/vendors*", VENDORS_STUB).as("getVendors");
    cy.intercept("GET", "/api/admin/categories*", CATEGORIES_STUB).as("getCategories");
    cy.intercept("GET", "/api/brands*", BRANDS_STUB).as("getBrands");
    cy.visit("/admin/products", { onBeforeLoad: stubAuth });
    cy.wait("@getProducts");
  });

  it("renders category select with DB options", () => {
    cy.wait("@getCategories");
    cy.get("[data-testid='category-filter']").should("be.visible");
    cy.get("[data-testid='category-filter'] option").should("have.length.gte", 3);
    cy.get("[data-testid='category-filter']").contains("Dairy");
    cy.get("[data-testid='category-filter']").contains("Bakery");
  });

  it("renders brand select with DB options", () => {
    cy.wait("@getBrands");
    cy.get("[data-testid='brand-filter']").should("be.visible");
    cy.get("[data-testid='brand-filter'] option").should("have.length.gte", 3);
    cy.get("[data-testid='brand-filter']").contains("NatureFarm");
  });

  it("selecting a category triggers API call with category param", () => {
    cy.wait("@getCategories");
    cy.intercept("GET", "/api/admin/products*", (req) => {
      expect(req.query).to.have.property("category", "Dairy");
      req.reply(PRODUCTS_STUB);
    }).as("filteredProducts");

    cy.get("[data-testid='category-filter']").select("Dairy");
    cy.wait("@filteredProducts");
  });

  it("selecting a brand triggers API call with brand param", () => {
    cy.wait("@getBrands");
    cy.intercept("GET", "/api/admin/products*", (req) => {
      expect(req.query).to.have.property("brand", "NatureFarm");
      req.reply(PRODUCTS_STUB);
    }).as("filteredBrandProducts");

    cy.get("[data-testid='brand-filter']").select("NatureFarm");
    cy.wait("@filteredBrandProducts");
  });

  it("shows AdminDateFilter inside advanced panel", () => {
    cy.get("[data-testid='advanced-filters-toggle']").click();
    cy.get("[data-testid='date-filter-btn']").should("be.visible");
    cy.get("input[data-testid='date-from-filter']").should("not.exist");
    cy.get("input[data-testid='date-to-filter']").should("not.exist");
  });

  it("applies date preset from advanced panel and fires API", () => {
    cy.get("[data-testid='advanced-filters-toggle']").click();
    cy.intercept("GET", "/api/admin/products*", (req) => {
      expect(req.query).to.have.property("dateFrom");
      req.reply(PRODUCTS_STUB);
    }).as("dateFilteredProducts");

    cy.get("[data-testid='date-filter-btn']").click();
    cy.get("[data-testid='date-preset-this-month']").click();
    cy.wait("@dateFilteredProducts");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Vendors Page — View modal, edit, save
// ─────────────────────────────────────────────────────────────────────────────

const VENDORS_PAGE_STUB = {
  success: true,
  data: {
    vendors: [VENDOR_DETAIL],
    total: 1, page: 1, totalPages: 1,
  },
};

describe("Vendors Page — View/Edit Modal", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/vendors*", VENDORS_PAGE_STUB).as("getVendors");
    cy.visit("/admin/vendors", { onBeforeLoad: stubAuth });
    cy.wait("@getVendors");
  });

  it("renders the vendor row with View button", () => {
    cy.get("[data-testid='vendor-row']").should("have.length", 1);
    cy.get(`[data-testid='view-vendor-v1']`).should("be.visible");
  });

  it("opens vendor detail modal on View click", () => {
    cy.get(`[data-testid='view-vendor-v1']`).click();
    cy.get("[data-testid='vendor-detail-modal']").should("be.visible");
    cy.contains("FreshMart").should("be.visible");
    cy.contains("fresh@mart.com").should("be.visible");
    cy.contains("Mumbai").should("be.visible");
  });

  it("closes modal when clicking Close button", () => {
    cy.get(`[data-testid='view-vendor-v1']`).click();
    cy.get("[data-testid='vendor-detail-modal']").should("be.visible");
    cy.get("[data-testid='vendor-modal-close']").click();
    cy.get("[data-testid='vendor-detail-modal']").should("not.exist");
  });

  it("switches to edit mode on Edit click", () => {
    cy.get(`[data-testid='view-vendor-v1']`).click();
    cy.get("[data-testid='vendor-edit-btn']").click();
    cy.get("[data-testid='vendor-edit-name']").should("be.visible").and("have.value", "FreshMart");
    cy.get("[data-testid='vendor-edit-email']").should("have.value", "fresh@mart.com");
    cy.get("[data-testid='vendor-edit-city']").should("have.value", "Mumbai");
  });

  it("saves edited vendor via PUT and updates view", () => {
    cy.intercept("PUT", "/api/admin/vendors/v1", {
      success: true,
      data: { ...VENDOR_DETAIL, city: "Delhi" },
    }).as("updateVendor");

    cy.get(`[data-testid='view-vendor-v1']`).click();
    cy.get("[data-testid='vendor-edit-btn']").click();
    cy.get("[data-testid='vendor-edit-city']").clear().type("Delhi");
    cy.get("[data-testid='vendor-save-btn']").click();
    cy.wait("@updateVendor");

    // should exit edit mode and show updated view
    cy.get("[data-testid='vendor-edit-btn']").should("be.visible");
    cy.get("[data-testid='vendor-edit-name']").should("not.exist");
  });

  it("shows error if save fails", () => {
    cy.intercept("PUT", "/api/admin/vendors/v1", {
      success: false, error: "Validation failed",
    }).as("failedUpdate");

    cy.get(`[data-testid='view-vendor-v1']`).click();
    cy.get("[data-testid='vendor-edit-btn']").click();
    cy.get("[data-testid='vendor-save-btn']").click();
    cy.wait("@failedUpdate");
    cy.contains("Validation failed").should("be.visible");
  });

  it("cancel edit returns to view mode", () => {
    cy.get(`[data-testid='view-vendor-v1']`).click();
    cy.get("[data-testid='vendor-edit-btn']").click();
    cy.get("[data-testid='vendor-edit-name']").should("be.visible");
    cy.contains("Cancel").click();
    cy.get("[data-testid='vendor-edit-name']").should("not.exist");
    cy.get("[data-testid='vendor-edit-btn']").should("be.visible");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Categories Page — isActive status filter tabs
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES_PAGE_STUB = {
  success: true,
  data: [
    { _id: "c1", name: "Dairy",  slug: "dairy",  emoji: "🥛", description: "",  color: "bg-blue-50",  textColor: "text-blue-700",  order: 1, isActive: true,  productCount: 12 },
    { _id: "c2", name: "Bakery", slug: "bakery", emoji: "🍞", description: "",  color: "bg-amber-50", textColor: "text-amber-700", order: 2, isActive: false, productCount: 5  },
  ],
};

describe("Categories Page — Status Filter", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/categories*", CATEGORIES_PAGE_STUB).as("getCategories");
    cy.visit("/admin/categories", { onBeforeLoad: stubAuth });
    cy.wait("@getCategories");
  });

  it("renders status filter tabs", () => {
    cy.get("[data-testid='category-status-filters']").should("be.visible");
    cy.get("[data-testid='category-status-all']").should("be.visible");
    cy.get("[data-testid='category-status-true']").should("be.visible");
    cy.get("[data-testid='category-status-false']").should("be.visible");
  });

  it("All tab is active by default", () => {
    cy.get("[data-testid='category-status-all']").should("have.class", "bg-[#0F4C75]");
  });

  it("clicking Active tab fires API with isActive=true", () => {
    cy.intercept("GET", "/api/admin/categories*", (req) => {
      expect(req.query).to.have.property("isActive", "true");
      req.reply({ success: true, data: [CATEGORIES_PAGE_STUB.data[0]] });
    }).as("activeCategories");

    cy.get("[data-testid='category-status-true']").click();
    cy.wait("@activeCategories");
    cy.get("[data-testid='category-status-true']").should("have.class", "bg-[#0F4C75]");
  });

  it("clicking Inactive tab fires API with isActive=false", () => {
    cy.intercept("GET", "/api/admin/categories*", (req) => {
      expect(req.query).to.have.property("isActive", "false");
      req.reply({ success: true, data: [CATEGORIES_PAGE_STUB.data[1]] });
    }).as("inactiveCategories");

    cy.get("[data-testid='category-status-false']").click();
    cy.wait("@inactiveCategories");
  });

  it("search and status filter work together", () => {
    cy.intercept("GET", "/api/admin/categories*", (req) => {
      expect(req.query).to.have.property("q");
      expect(req.query).to.have.property("isActive", "true");
      req.reply({ success: true, data: [CATEGORIES_PAGE_STUB.data[0]] });
    }).as("combinedFilter");

    cy.get("[data-testid='category-status-true']").click();
    cy.get("[data-testid='category-search']").type("Da");
    cy.wait("@combinedFilter");
  });

  it("clicking All tab resets filter", () => {
    cy.get("[data-testid='category-status-true']").click();
    cy.intercept("GET", "/api/admin/categories*", (req) => {
      expect(req.query).to.not.have.property("isActive");
      req.reply(CATEGORIES_PAGE_STUB);
    }).as("allCategories");

    cy.get("[data-testid='category-status-all']").click();
    cy.wait("@allCategories");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Promo Codes Page — status filter tabs
// ─────────────────────────────────────────────────────────────────────────────

const PROMOS_STUB = {
  success: true,
  data: [
    {
      _id: "pr1", title: "Summer Sale", code: "SUMMER20",
      discountType: "percentage", discountValue: 20, maxCap: 200,
      minOrderValue: 500, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      isActive: true, usageLimit: 100, usedCount: 45, perUserLimit: 2,
      firstOrderOnly: false, eligibleCategories: [],
    },
    {
      _id: "pr2", title: "Old Deal", code: "OLD10",
      discountType: "fixed", discountValue: 50, maxCap: null,
      minOrderValue: 0, expiresAt: "2024-01-01T00:00:00.000Z",
      isActive: false, usageLimit: null, usedCount: 5, perUserLimit: null,
      firstOrderOnly: false, eligibleCategories: [],
    },
  ],
};

describe("Promo Codes Page — Status Filter", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/promocodes*", PROMOS_STUB).as("getPromos");
    cy.visit("/admin/promocodes", { onBeforeLoad: stubAuth });
    cy.wait("@getPromos");
  });

  it("renders status filter tabs", () => {
    cy.get("[data-testid='promo-status-filters']").should("be.visible");
    cy.get("[data-testid='promo-status-all']").should("be.visible");
    cy.get("[data-testid='promo-status-active']").should("be.visible");
    cy.get("[data-testid='promo-status-expired']").should("be.visible");
    cy.get("[data-testid='promo-status-inactive']").should("be.visible");
  });

  it("All tab is selected by default", () => {
    cy.get("[data-testid='promo-status-all']").should("have.class", "bg-[#0F4C75]");
  });

  it("clicking Active tab sends status=active to API", () => {
    cy.intercept("GET", "/api/admin/promocodes*", (req) => {
      expect(req.query).to.have.property("status", "active");
      req.reply({ success: true, data: [PROMOS_STUB.data[0]] });
    }).as("activePromos");

    cy.get("[data-testid='promo-status-active']").click();
    cy.wait("@activePromos");
    cy.get("[data-testid='promo-status-active']").should("have.class", "bg-[#0F4C75]");
  });

  it("clicking Expired tab sends status=expired to API", () => {
    cy.intercept("GET", "/api/admin/promocodes*", (req) => {
      expect(req.query).to.have.property("status", "expired");
      req.reply({ success: true, data: [PROMOS_STUB.data[1]] });
    }).as("expiredPromos");

    cy.get("[data-testid='promo-status-expired']").click();
    cy.wait("@expiredPromos");
  });

  it("clicking Inactive tab sends status=inactive to API", () => {
    cy.intercept("GET", "/api/admin/promocodes*", (req) => {
      expect(req.query).to.have.property("status", "inactive");
      req.reply({ success: true, data: [] });
    }).as("inactivePromos");

    cy.get("[data-testid='promo-status-inactive']").click();
    cy.wait("@inactivePromos");
  });

  it("search and status filter work together", () => {
    cy.intercept("GET", "/api/admin/promocodes*", (req) => {
      expect(req.query).to.have.property("q", "SUMMER");
      expect(req.query).to.have.property("status", "active");
      req.reply({ success: true, data: [PROMOS_STUB.data[0]] });
    }).as("combinedFilter");

    cy.get("[data-testid='promo-status-active']").click();
    cy.get("[data-testid='promo-search']").type("SUMMER");
    cy.wait("@combinedFilter");
  });

  it("clicking All tab clears the status filter", () => {
    cy.get("[data-testid='promo-status-active']").click();
    cy.intercept("GET", "/api/admin/promocodes*", (req) => {
      expect(req.query).to.not.have.property("status");
      req.reply(PROMOS_STUB);
    }).as("allPromos");

    cy.get("[data-testid='promo-status-all']").click();
    cy.wait("@allPromos");
  });
});

export {};
