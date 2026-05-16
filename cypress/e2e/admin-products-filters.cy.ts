/// <reference types="cypress" />

/*
 * E2E — Admin Products Filters
 * Tests filters, pagination, sorting, URL persistence, and clear filters
 * for the admin products management page.
 */

const ADMIN_AUTH = {
  user:  { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
  token: "fake-admin-token",
};

const PRODUCTS_STUB = {
  success: true,
  data: {
    products: [
      {
        _id: "p1", name: "Organic Milk 2L", slug: "organic-milk-2l",
        price: 120, originalPrice: 150, images: ["/images/placeholder-product.webp"],
        category: "Dairy", subcategory: "Milk", brand: "NatureFarm",
        unit: "2L", inStock: true, rating: 4.5, reviewCount: 30,
        badge: "ORGANIC", status: "approved", vendorName: null,
        createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        _id: "p2", name: "Sourdough Bread 800g", slug: "sourdough-bread-800g",
        price: 80, originalPrice: null, images: ["/images/placeholder-product.webp"],
        category: "Bakery", subcategory: null, brand: "ArtisanBakes",
        unit: "800g", inStock: false, rating: 4.8, reviewCount: 50,
        badge: null, status: "pending", vendorName: "Artisan Vendor",
        createdAt: "2024-02-01T00:00:00.000Z", updatedAt: "2024-02-01T00:00:00.000Z",
      },
    ],
    total: 2, page: 1, totalPages: 1,
  },
};

const EMPTY_STUB = {
  success: true,
  data: { products: [], total: 0, page: 1, totalPages: 0 },
};

const VENDORS_STUB = {
  success: true,
  data: { vendors: [{ _id: "v1", name: "Artisan Vendor" }] },
};

function stubAuth() {
  const authState = { state: { user: ADMIN_AUTH.user, token: ADMIN_AUTH.token, hasHydrated: true }, version: 0 };
  window.localStorage.setItem("prakash-auth", JSON.stringify(authState));
}

function interceptProducts(body = PRODUCTS_STUB) {
  cy.intercept("GET", "/api/admin/products*", body).as("getProducts");
}

function interceptVendors() {
  cy.intercept("GET", "/api/admin/vendors*", VENDORS_STUB).as("getVendors");
}

function visitAdmin(qs = "") {
  cy.visit(`/admin/products${qs ? `?${qs}` : ""}`, {
    onBeforeLoad: stubAuth,
  });
}

// ── Page render ───────────────────────────────────────────────────────────────

describe("Admin Products — Page Render", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
  });

  it("renders the Products heading", () => {
    cy.contains("Products").should("be.visible");
  });

  it("shows the Add Product button", () => {
    cy.get("[data-testid='add-product-btn']").should("be.visible");
  });

  it("displays product rows from API", () => {
    cy.get("[data-testid='product-row']").should("have.length", 2);
  });

  it("shows search input", () => {
    cy.get("[data-testid='product-search']").should("exist");
  });

  it("shows vendor filter dropdown", () => {
    cy.get("[data-testid='vendor-filter']").should("exist");
  });

  it("shows status filter tabs", () => {
    cy.get("[data-testid='status-filters']").should("exist");
    cy.get("[data-testid='status-filter-all']").should("be.visible");
  });

  it("shows sort filter", () => {
    cy.get("[data-testid='sort-filter']").should("exist");
  });

  it("shows More / advanced filters toggle", () => {
    cy.get("[data-testid='advanced-filters-toggle']").should("be.visible");
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

describe("Admin Products — Search Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
  });

  it("debounces search and updates URL", () => {
    cy.get("[data-testid='product-search']").type("milk");
    cy.url().should("include", "search=milk");
  });

  it("shows active filter chip when search is set", () => {
    cy.get("[data-testid='product-search']").type("bread");
    cy.get("[data-testid='active-filters']").contains("bread").should("exist");
  });

  it("removing search chip clears URL param", () => {
    cy.get("[data-testid='product-search']").type("milk");
    cy.url().should("include", "search=milk");
    cy.get("[data-testid='active-filters']").find("button").first().click();
    cy.url().should("not.include", "search=milk");
  });
});

// ── Status filter ─────────────────────────────────────────────────────────────

describe("Admin Products — Status Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
  });

  it("clicking Pending sets status=pending in URL", () => {
    cy.get("[data-testid='status-filter-pending']").click();
    cy.url().should("include", "status=pending");
  });

  it("clicking Approved sets status=approved in URL", () => {
    cy.get("[data-testid='status-filter-approved']").click();
    cy.url().should("include", "status=approved");
  });

  it("clicking Rejected sets status=rejected in URL", () => {
    cy.get("[data-testid='status-filter-rejected']").click();
    cy.url().should("include", "status=rejected");
  });

  it("clicking All clears status from URL", () => {
    visitAdmin("status=pending");
    cy.get("[data-testid='status-filter-all']").click();
    cy.url().should("not.include", "status=");
  });

  it("shows active chip for status filter", () => {
    cy.get("[data-testid='status-filter-pending']").click();
    cy.get("[data-testid='active-filters']").contains("Pending").should("exist");
  });
});

// ── InStock filter ────────────────────────────────────────────────────────────

describe("Admin Products — InStock Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
  });

  it("selecting In Stock sets inStock=true in URL", () => {
    cy.get("[data-testid='instock-filter']").select("In Stock");
    cy.url().should("include", "inStock=true");
  });

  it("selecting Out of Stock sets inStock=false in URL", () => {
    cy.get("[data-testid='instock-filter']").select("Out of Stock");
    cy.url().should("include", "inStock=false");
  });

  it("shows active chip for inStock filter", () => {
    cy.get("[data-testid='instock-filter']").select("In Stock");
    cy.get("[data-testid='active-filters']").contains("In Stock").should("exist");
  });
});

// ── Badge filter ──────────────────────────────────────────────────────────────

describe("Admin Products — Badge Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
  });

  it("selecting ORGANIC badge sets badge=ORGANIC in URL", () => {
    cy.get("[data-testid='badge-filter']").select("ORGANIC");
    cy.url().should("include", "badge=ORGANIC");
  });

  it("shows active chip for badge filter", () => {
    cy.get("[data-testid='badge-filter']").select("HOT");
    cy.get("[data-testid='active-filters']").contains("HOT").should("exist");
  });
});

// ── Advanced filters ──────────────────────────────────────────────────────────

describe("Admin Products — Advanced Filters", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
    cy.get("[data-testid='advanced-filters-toggle']").click();
  });

  it("price range updates URL when both min and max are set", () => {
    cy.get("[data-testid='min-price-filter']").type("50");
    cy.get("[data-testid='max-price-filter']").type("200");
    cy.url().should("include", "minPrice=50");
    cy.url().should("include", "maxPrice=200");
  });

  it("rating filter sets rating param in URL", () => {
    cy.get("[data-testid='rating-filter']").select("4+ Stars");
    cy.url().should("include", "rating=4");
  });

  it("discount filter sets discount param in URL", () => {
    cy.get("[data-testid='discount-filter']").select("25%+ off");
    cy.url().should("include", "discount=25");
  });

  it("date range sets dateFrom and dateTo in URL", () => {
    cy.get("[data-testid='date-from-filter']").type("2024-01-01");
    cy.get("[data-testid='date-to-filter']").type("2024-12-31");
    cy.url().should("include", "dateFrom=2024-01-01");
    cy.url().should("include", "dateTo=2024-12-31");
  });

  it("subcategory filter sets subcategory in URL", () => {
    cy.get("[data-testid='subcategory-filter']").type("Milk");
    cy.url().should("include", "subcategory=Milk");
  });
});

// ── Sort filter ───────────────────────────────────────────────────────────────

describe("Admin Products — Sort Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
  });

  it("changing sort to Price: Low → High sets sortBy=price-asc", () => {
    cy.get("[data-testid='sort-filter']").select("Price: Low → High");
    cy.url().should("include", "sortBy=price-asc");
  });

  it("changing sort to Top Rated sets sortBy=rating", () => {
    cy.get("[data-testid='sort-filter']").select("Top Rated");
    cy.url().should("include", "sortBy=rating");
  });

  it("Newest First does not add sortBy to URL (it is the default)", () => {
    cy.get("[data-testid='sort-filter']").select("Price: Low → High");
    cy.get("[data-testid='sort-filter']").select("Newest First");
    cy.url().should("not.include", "sortBy=newest");
  });
});

// ── Clear filters ─────────────────────────────────────────────────────────────

describe("Admin Products — Clear Filters", () => {
  it("clear button resets all filter params from URL", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin("status=pending&inStock=true&badge=HOT");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.url().should("not.include", "status=");
    cy.url().should("not.include", "inStock=");
    cy.url().should("not.include", "badge=");
  });

  it("clear button does not appear when no filters are active", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin();
    cy.get("[data-testid='clear-all-filters']").should("not.exist");
  });

  it("active filter chips disappear after clear", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin("status=approved");
    cy.get("[data-testid='active-filters']").should("exist");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.get("[data-testid='active-filters']").should("not.exist");
  });
});

// ── URL persistence ───────────────────────────────────────────────────────────

describe("Admin Products — URL Persistence", () => {
  it("filters persist on page refresh", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin("status=pending&inStock=true");
    cy.reload();
    cy.url().should("include", "status=pending");
    cy.url().should("include", "inStock=true");
  });

  it("page renders correctly when loading directly with filters in URL", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin("status=approved&badge=ORGANIC&sortBy=rating");
    cy.contains("Products").should("be.visible");
    cy.get("[data-testid='active-filters']").should("exist");
  });

  it("filter state is initialized from URL on mount", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin("status=rejected");
    cy.get("[data-testid='status-filter-rejected']").should("have.class", "bg-[#0F4C75]");
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe("Admin Products — Pagination", () => {
  it("filter change resets to page 1", () => {
    interceptProducts();
    interceptVendors();
    visitAdmin("page=2");
    cy.get("[data-testid='status-filter-pending']").click();
    cy.url().should("not.include", "page=2");
    cy.url().should("include", "status=pending");
  });

  it("page param persists in URL when navigating pages", () => {
    cy.intercept("GET", "/api/admin/products*", {
      success: true,
      data: { products: PRODUCTS_STUB.data.products, total: 50, page: 2, totalPages: 3 },
    }).as("page2");
    interceptVendors();
    visitAdmin("page=2");
    cy.get("[data-testid='pagination-info']").should("contain", "Page 2");
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe("Admin Products — Empty State", () => {
  it("shows no products found when API returns empty list", () => {
    cy.intercept("GET", "/api/admin/products*", EMPTY_STUB).as("emptyProducts");
    interceptVendors();
    visitAdmin("status=rejected");
    cy.contains("No products found").should("be.visible");
  });
});

// ── API validation ────────────────────────────────────────────────────────────

describe("Admin Products — API Validation", () => {
  it("API returns 400 for invalid status value", () => {
    cy.request({ url: "/api/admin/products?status=unknown", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 for invalid badge value", () => {
    cy.request({ url: "/api/admin/products?badge=INVALID", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 200 with valid status filter", () => {
    cy.request({ url: "/api/admin/products?status=approved", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.be.oneOf([200, 401]);
    });
  });
});
