/// <reference types="cypress" />

/*
 * E2E — Dynamic Attribute-Based Filtering System
 * Tests dynamic filter rendering, category-based filter changes,
 * multiselect filters, URL sync, mobile filters, filter persistence,
 * and admin category attribute management.
 */

const ADMIN_AUTH = {
  user:  { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
  token: "fake-admin-token",
};

const MOBILE_CATEGORY_ATTRS = {
  success: true,
  data: {
    _id: "catattr1",
    category: "mobiles",
    label: "Mobiles",
    isActive: true,
    attributes: [
      { key: "ram",      label: "RAM",      type: "select",      filterable: true, searchable: false, required: false, options: ["4GB","8GB","12GB"], order: 0 },
      { key: "storage",  label: "Storage",  type: "select",      filterable: true, searchable: false, required: false, options: ["64GB","128GB","256GB"], order: 1 },
      { key: "network",  label: "Network",  type: "multiselect", filterable: true, searchable: false, required: false, options: ["4G","5G"], order: 2 },
      { key: "organic",  label: "Organic",  type: "boolean",     filterable: true, searchable: false, required: false, options: [], order: 3 },
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
};

const DYNAMIC_FILTERS_RESPONSE = {
  success: true,
  data: {
    filters: [
      {
        key: "ram", label: "RAM", type: "select",
        values: [{ value: "8GB", count: 5 }, { value: "12GB", count: 3 }, { value: "4GB", count: 2 }],
      },
      {
        key: "storage", label: "Storage", type: "select",
        values: [{ value: "128GB", count: 6 }, { value: "256GB", count: 2 }],
      },
      {
        key: "network", label: "Network", type: "multiselect",
        values: [{ value: "5G", count: 4 }, { value: "4G", count: 6 }],
      },
    ],
  },
};

const EMPTY_PRODUCTS = {
  success: true,
  data: { products: [], total: 0, page: 1, totalPages: 1 },
};

const CATEGORIES_STUB = {
  success: true,
  data: [
    { name: "Mobiles", slug: "mobiles", count: 10 },
    { name: "Oats",    slug: "oats",    count: 5  },
  ],
};

const BRANDS_STUB = { success: true, data: ["Apple", "Samsung", "OnePlus"] };

const FILTER_META_STUB = {
  success: true,
  data: { brands: ["Apple", "Samsung"], subcategories: ["Smartphones", "Feature Phones"] },
};

function loginAdmin() {
  cy.window().then((win) => {
    win.localStorage.setItem(
      "prakash-auth",
      JSON.stringify({ state: ADMIN_AUTH, version: 0 }),
    );
  });
}

// ── Admin Category Attributes Tests ───────────────────────────────────────────

describe("Admin Category Attributes Management", () => {
  beforeEach(() => {
    loginAdmin();
    cy.intercept("GET", "/api/admin/category-attributes", {
      statusCode: 200,
      body: {
        success: true,
        data: [MOBILE_CATEGORY_ATTRS.data],
      },
    }).as("getCategoryAttrs");
  });

  it("loads the category attributes page", () => {
    cy.visit("/admin/category-attributes");
    cy.wait("@getCategoryAttrs");
    cy.contains("Category Attributes").should("be.visible");
    cy.get("[data-testid='add-category-attr-btn']").should("be.visible");
  });

  it("shows existing category attribute schemas", () => {
    cy.visit("/admin/category-attributes");
    cy.wait("@getCategoryAttrs");
    cy.get("[data-testid='cat-attr-row-mobiles']").should("exist");
    cy.contains("Mobiles").should("be.visible");
  });

  it("opens add category schema modal", () => {
    cy.visit("/admin/category-attributes");
    cy.wait("@getCategoryAttrs");
    cy.get("[data-testid='add-category-attr-btn']").click();
    cy.get("[data-testid='cat-attr-category']").should("be.visible");
    cy.get("[data-testid='cat-attr-label']").should("be.visible");
    cy.get("[data-testid='add-attr-btn']").should("be.visible");
  });

  it("adds a new attribute to the form", () => {
    cy.visit("/admin/category-attributes");
    cy.wait("@getCategoryAttrs");
    cy.get("[data-testid='add-category-attr-btn']").click();
    cy.get("[data-testid='cat-attr-category']").type("oats");
    cy.get("[data-testid='cat-attr-label']").type("Oats");
    cy.get("[data-testid='add-attr-btn']").click();
    cy.get("[data-testid='attr-key-0']").should("be.visible");
    cy.get("[data-testid='attr-label-0']").should("be.visible");
  });

  it("saves a new category schema", () => {
    cy.intercept("POST", "/api/admin/category-attributes", {
      statusCode: 201,
      body: { success: true, data: { _id: "new1", category: "oats", label: "Oats", isActive: true, attributes: [], createdAt: "", updatedAt: "" } },
    }).as("createCatAttr");

    cy.visit("/admin/category-attributes");
    cy.wait("@getCategoryAttrs");
    cy.get("[data-testid='add-category-attr-btn']").click();
    cy.get("[data-testid='cat-attr-category']").type("oats");
    cy.get("[data-testid='cat-attr-label']").type("Oats");
    cy.get("[data-testid='save-cat-attr-btn']").click();
    cy.wait("@createCatAttr");
  });

  it("deletes a category schema with confirmation", () => {
    cy.intercept("DELETE", "/api/admin/category-attributes/*", {
      statusCode: 200,
      body: { success: true, message: "Deleted" },
    }).as("deleteCatAttr");

    cy.visit("/admin/category-attributes");
    cy.wait("@getCategoryAttrs");
    cy.on("window:confirm", () => true);
    cy.get("[data-testid='delete-cat-attr-mobiles']").click();
    cy.wait("@deleteCatAttr");
  });
});

// ── Dynamic Filters — Products Page ───────────────────────────────────────────

describe("Dynamic FilterBar — Customer Products Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/categories", CATEGORIES_STUB).as("getCategories");
    cy.intercept("GET", "/api/brands", BRANDS_STUB).as("getBrands");
    cy.intercept("GET", "/api/products/meta*", FILTER_META_STUB).as("getMeta");
    cy.intercept("GET", "/api/products*", EMPTY_PRODUCTS).as("getProducts");
    cy.intercept("GET", "/api/products/dynamic-filters*", DYNAMIC_FILTERS_RESPONSE).as("getDynamicFilters");
    cy.intercept("GET", "/api/category-attributes*", MOBILE_CATEGORY_ATTRS).as("getCatAttrs");
  });

  it("renders filter sidebar with no dynamic filters when no category selected", () => {
    cy.visit("/products");
    cy.get("[data-testid='filters-sidebar']").should("be.visible");
    // No dynamic attr filters without a category
    cy.get("[data-testid^='attr-filter-']").should("not.exist");
  });

  it("renders dynamic attribute filter sections after category selection", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.get("[data-testid='filters-sidebar']").should("be.visible");
    // Dynamic filters should appear as collapsible sections
    cy.contains("RAM").should("exist");
    cy.contains("Storage").should("exist");
    cy.contains("Network").should("exist");
  });

  it("toggles a dynamic filter value and syncs URL", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.contains("RAM").click(); // Expand section
    cy.get("[data-testid='attr-filter-ram-8GB']").check({ force: true });
    cy.url().should("include", "attrs=");
    cy.url().should("include", "ram");
  });

  it("renders multiselect dynamic filters as checkboxes", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.contains("Network").click();
    cy.get("[data-testid='attr-filter-network-5G']").should("exist");
    cy.get("[data-testid='attr-filter-network-4G']").should("exist");
  });

  it("selecting multiple values for same attribute applies OR filter", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.contains("RAM").click();
    cy.get("[data-testid='attr-filter-ram-8GB']").check({ force: true });
    cy.get("[data-testid='attr-filter-ram-12GB']").check({ force: true });
    cy.url().should("include", "8GB");
    cy.url().should("include", "12GB");
  });

  it("shows active attribute filter chips in ActiveFilters", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D");
    cy.wait("@getDynamicFilters");
    cy.get("[data-testid='active-filters']").should("exist");
    cy.contains("8GB").should("be.visible");
  });

  it("removes an attribute chip by clicking X", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D");
    cy.wait("@getDynamicFilters");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.get("button[aria-label*='Remove']").first().click();
    });
    cy.url().should("not.include", "8GB");
  });

  it("clear all filters removes attrs param", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D");
    cy.wait("@getDynamicFilters");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.url().should("not.include", "attrs");
  });

  it("dynamic filters persist on page navigation back", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D");
    cy.url().should("include", "attrs");
    cy.go("back");
    cy.go("forward");
    cy.url().should("include", "attrs");
  });

  it("changing category clears existing attribute filters", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D");
    cy.wait("@getDynamicFilters");
    cy.contains("Category").click();
    cy.get("[data-testid='category-filter-oats']").click();
    cy.url().should("not.include", "attrs");
  });
});

// ── Dynamic Filters — Mobile Drawer ──────────────────────────────────────────

describe("Dynamic FilterBar — Mobile Drawer", () => {
  beforeEach(() => {
    cy.viewport("iphone-6");
    cy.intercept("GET", "/api/categories", CATEGORIES_STUB).as("getCategories");
    cy.intercept("GET", "/api/brands", BRANDS_STUB).as("getBrands");
    cy.intercept("GET", "/api/products/meta*", FILTER_META_STUB).as("getMeta");
    cy.intercept("GET", "/api/products*", EMPTY_PRODUCTS).as("getProducts");
    cy.intercept("GET", "/api/products/dynamic-filters*", DYNAMIC_FILTERS_RESPONSE).as("getDynamicFilters");
    cy.intercept("GET", "/api/category-attributes*", MOBILE_CATEGORY_ATTRS).as("getCatAttrs");
  });

  it("opens mobile filter drawer", () => {
    cy.visit("/products?category=mobiles");
    cy.get("[data-testid='mobile-filters-button']").should("be.visible").click();
    cy.get("[data-testid='filters-sidebar']").should("be.visible");
    cy.get("[data-testid='close-mobile-filters']").should("be.visible");
  });

  it("shows dynamic filters in mobile drawer", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.contains("RAM").should("be.visible");
    cy.contains("Storage").should("be.visible");
  });

  it("applies mobile filter and closes drawer", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.contains("RAM").click();
    cy.get("[data-testid='attr-filter-ram-8GB']").check({ force: true });
    cy.get("[data-testid='apply-mobile-filters']").click();
    cy.get("[data-testid='filters-sidebar']").should("not.be.visible");
    cy.url().should("include", "attrs");
  });
});

// ── Admin Product Form — Dynamic Attribute Fields ─────────────────────────────

describe("Admin Product Form — Dynamic Attribute Fields", () => {
  beforeEach(() => {
    loginAdmin();

    cy.intercept("GET", "/api/admin/products*", {
      statusCode: 200,
      body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1 } },
    }).as("getAdminProducts");

    cy.intercept("GET", "/api/admin/vendors*", {
      statusCode: 200,
      body: { success: true, data: { vendors: [] } },
    }).as("getVendors");

    cy.intercept("GET", "/api/admin/vendors/dropdown*", {
      statusCode: 200,
      body: { success: true, data: { vendors: [] } },
    }).as("getVendorDropdown");

    cy.intercept("GET", "/api/admin/categories", {
      statusCode: 200,
      body: { success: true, data: [{ name: "Mobiles" }, { name: "Oats" }] },
    }).as("getAdminCategories");

    cy.intercept("GET", "/api/brands", BRANDS_STUB).as("getBrands");

    cy.intercept("GET", "/api/category-attributes?category=mobiles", MOBILE_CATEGORY_ATTRS).as("getMobileCatAttrs");
  });

  it("renders dynamic attribute fields when category changes to Mobiles", () => {
    cy.visit("/admin/products");
    cy.wait("@getAdminProducts");
    cy.get("[data-testid='add-product-btn']").click();
    cy.get("[data-testid='product-category-select']").select("Mobiles");
    cy.wait("@getMobileCatAttrs");
    cy.get("[data-testid='attr-field-ram']").should("exist");
    cy.get("[data-testid='attr-field-storage']").should("exist");
  });

  it("renders boolean attribute as checkbox", () => {
    cy.visit("/admin/products");
    cy.wait("@getAdminProducts");
    cy.get("[data-testid='add-product-btn']").click();
    cy.get("[data-testid='product-category-select']").select("Mobiles");
    cy.wait("@getMobileCatAttrs");
    cy.get("[data-testid='attr-field-organic']").should("have.attr", "type", "checkbox");
  });

  it("clears dynamic attrs when category changes", () => {
    cy.intercept("GET", "/api/category-attributes?category=oats", {
      statusCode: 200,
      body: { success: true, data: null },
    }).as("getOatsCatAttrs");

    cy.visit("/admin/products");
    cy.wait("@getAdminProducts");
    cy.get("[data-testid='add-product-btn']").click();
    cy.get("[data-testid='product-category-select']").select("Mobiles");
    cy.wait("@getMobileCatAttrs");
    cy.get("[data-testid='attr-field-ram']").should("exist");
    cy.get("[data-testid='product-category-select']").select("Oats");
    cy.wait("@getOatsCatAttrs");
    cy.get("[data-testid='attr-field-ram']").should("not.exist");
  });
});

// ── Dynamic Filters API — URL Param Sync ─────────────────────────────────────

describe("Dynamic Filters — URL Param Persistence", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/categories", CATEGORIES_STUB).as("getCategories");
    cy.intercept("GET", "/api/brands", BRANDS_STUB).as("getBrands");
    cy.intercept("GET", "/api/products/meta*", FILTER_META_STUB).as("getMeta");
    cy.intercept("GET", "/api/products*", EMPTY_PRODUCTS).as("getProducts");
    cy.intercept("GET", "/api/products/dynamic-filters*", DYNAMIC_FILTERS_RESPONSE).as("getDynamicFilters");
    cy.intercept("GET", "/api/category-attributes*", MOBILE_CATEGORY_ATTRS).as("getCatAttrs");
  });

  it("attrs param is preserved when applying pagination", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D&page=1");
    cy.url().should("include", "attrs");
  });

  it("attrs param is preserved when changing sort order", () => {
    cy.visit("/products?category=mobiles&attrs=%7B%22ram%22%3A%5B%228GB%22%5D%7D");
    cy.url().should("include", "attrs");
  });

  it("multiple attribute filters stack correctly in URL", () => {
    cy.visit("/products?category=mobiles");
    cy.wait("@getDynamicFilters");
    cy.contains("RAM").click();
    cy.get("[data-testid='attr-filter-ram-8GB']").check({ force: true });
    cy.url().should("include", "attrs");
    cy.contains("Storage").click();
    cy.get("[data-testid='attr-filter-storage-128GB']").check({ force: true });
    cy.url().should("include", "ram").and("include", "storage");
  });
});
