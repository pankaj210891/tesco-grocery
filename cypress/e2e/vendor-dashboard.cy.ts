/**
 * E2E: Vendor Dashboard (/vendor)
 *
 * Covers:
 *  - Page renders heading and subheading with vendor name + status
 *  - Stats grid shows 4 StatsCards populated from /api/vendor/stats
 *  - Analytics section shows revenue, orders, avg order value
 *  - Top products table renders when topProducts list is non-empty
 *  - Quick nav links to /vendor/products and /vendor/orders exist
 *  - Out-of-stock warning shown when outOfStockProducts > 0
 *  - Pending orders warning shown when pendingOrders > 0
 *  - Profile card shows vendor business name and email
 *  - Sidebar navigation is visible on desktop
 *  - Unauthenticated user is redirected to /login
 *  - API auth guards: GET /api/vendor/stats and /api/vendor/analytics return 401
 */

const VENDOR_EMAIL    = Cypress.env("VENDOR_EMAIL")    ?? "vendor@example.com";
const VENDOR_PASSWORD = Cypress.env("VENDOR_PASSWORD") ?? "Test@1234";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  totalProducts:      12,
  inStockProducts:    10,
  outOfStockProducts: 2,
  totalOrders:        35,
  pendingOrders:      3,
};

const MOCK_PROFILE = {
  _id:       "vendor001",
  name:      "Green Harvest",
  slug:      "green-harvest",
  email:     "vendor@example.com",
  ownerName: "Raj Kumar",
  phone:     "+91 98765 43210",
  address:   "12 Farm Lane",
  city:      "Mumbai",
  status:    "active",
  logo:      "",
  description: "Fresh organic produce",
  ownerId:   "user001",
  createdAt: new Date().toISOString(),
};

const MOCK_ANALYTICS = {
  totalRevenue:  48500,
  totalOrders:   35,
  pendingOrders: 3,
  totalProducts: 12,
  topProducts: [
    { name: "Organic Whole Milk", slug: "organic-whole-milk", revenue: 12000, quantity: 140 },
    { name: "Brown Eggs 6pcs",    slug: "brown-eggs-6",       revenue:  8500, quantity: 130 },
  ],
  revenueByMonth: [
    { month: "2025-01", revenue: 15000 },
    { month: "2025-02", revenue: 18000 },
    { month: "2025-03", revenue: 15500 },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function vendorLogin() {
  cy.request("POST", "/api/auth/login", {
    email:    VENDOR_EMAIL,
    password: VENDOR_PASSWORD,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const { token, user } = res.body.data as { token: string; user: object };
    window.localStorage.setItem(
      "prakash-auth",
      JSON.stringify({ state: { user, token, hasHydrated: true }, version: 0 }),
    );
  });
}

function interceptDashboard() {
  cy.intercept("GET", "/api/vendor/stats",     { body: { success: true, data: MOCK_STATS }     }).as("getStats");
  cy.intercept("GET", "/api/vendor/profile",   { body: { success: true, data: MOCK_PROFILE }   }).as("getProfile");
  cy.intercept("GET", "/api/vendor/analytics", { body: { success: true, data: MOCK_ANALYTICS } }).as("getAnalytics");
}

// ── Suite 1: Page rendering ───────────────────────────────────────────────────

describe("Vendor Dashboard — rendering", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("shows the Vendor Dashboard heading", () => {
    cy.contains("h1", "Vendor Dashboard").should("be.visible");
  });

  it("shows the vendor business name in the sub-heading", () => {
    cy.contains(MOCK_PROFILE.name).should("be.visible");
  });

  it("shows vendor status label", () => {
    cy.contains(MOCK_PROFILE.status).should("be.visible");
  });
});

// ── Suite 2: Stats cards ──────────────────────────────────────────────────────

describe("Vendor Dashboard — stats cards", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("renders the stats grid with 4 cards", () => {
    cy.get('[data-testid="vendor-stats-grid"]').find("a, div").filter(":has(.text-2xl)").should("have.length.gte", 4);
  });

  it("stats grid shows total products count", () => {
    cy.get('[data-testid="vendor-stats-grid"]').should("contain", String(MOCK_STATS.totalProducts));
  });

  it("stats grid shows in-stock products count", () => {
    cy.get('[data-testid="vendor-stats-grid"]').should("contain", String(MOCK_STATS.inStockProducts));
  });

  it("stats grid shows orders count", () => {
    cy.get('[data-testid="vendor-stats-grid"]').should("contain", String(MOCK_STATS.totalOrders));
  });

  it("shows pending orders sub-label on the Orders card", () => {
    cy.get('[data-testid="vendor-stats-grid"]').should("contain", `${MOCK_STATS.pendingOrders} pending`);
  });
});

// ── Suite 3: Analytics section ────────────────────────────────────────────────

describe("Vendor Dashboard — analytics cards", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("shows total revenue figure", () => {
    cy.get('[data-testid="vendor-total-revenue"]').should("be.visible");
    cy.get('[data-testid="vendor-total-revenue"]').should("contain", "48");
  });

  it("shows total orders figure in analytics section", () => {
    cy.get('[data-testid="vendor-total-orders"]').should("be.visible");
    cy.get('[data-testid="vendor-total-orders"]').should("contain", String(MOCK_ANALYTICS.totalOrders));
  });
});

// ── Suite 4: Top products table ───────────────────────────────────────────────

describe("Vendor Dashboard — top products table", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("renders the top products table", () => {
    cy.get('[data-testid="vendor-top-products"]').should("be.visible");
  });

  it("shows top product names in the table", () => {
    cy.get('[data-testid="vendor-top-products"]').should("contain", MOCK_ANALYTICS.topProducts[0].name);
    cy.get('[data-testid="vendor-top-products"]').should("contain", MOCK_ANALYTICS.topProducts[1].name);
  });

  it("shows product units sold", () => {
    cy.get('[data-testid="vendor-top-products"]').should("contain", String(MOCK_ANALYTICS.topProducts[0].quantity));
  });

  it("hides top products table when list is empty", () => {
    cy.intercept("GET", "/api/vendor/analytics", {
      body: { success: true, data: { ...MOCK_ANALYTICS, topProducts: [] } },
    }).as("getAnalyticsEmpty");

    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalyticsEmpty"]);
    cy.get('[data-testid="vendor-top-products"]').should("not.exist");
  });
});

// ── Suite 5: Quick navigation ─────────────────────────────────────────────────

describe("Vendor Dashboard — quick navigation", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("shows a Products quick-nav link", () => {
    cy.get('[data-testid="vendor-quick-nav"]').contains("a", "Products").should("have.attr", "href", "/vendor/products");
  });

  it("shows an Orders quick-nav link", () => {
    cy.get('[data-testid="vendor-quick-nav"]').contains("a", "Orders").should("have.attr", "href", "/vendor/orders");
  });

  it("shows 'out of stock' warning when outOfStockProducts > 0", () => {
    cy.get('[data-testid="vendor-quick-nav"]').should("contain", `${MOCK_STATS.outOfStockProducts} out of stock`);
  });

  it("shows pending orders warning when pendingOrders > 0", () => {
    cy.get('[data-testid="vendor-quick-nav"]').should("contain", `${MOCK_STATS.pendingOrders} pending`);
  });
});

// ── Suite 6: Profile card ─────────────────────────────────────────────────────

describe("Vendor Dashboard — profile card", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("shows vendor profile card", () => {
    cy.get('[data-testid="vendor-profile-card"]').should("be.visible");
  });

  it("shows vendor business name in profile card", () => {
    cy.get('[data-testid="vendor-profile-card"]').should("contain", MOCK_PROFILE.name);
  });

  it("shows vendor email in profile card", () => {
    cy.get('[data-testid="vendor-profile-card"]').should("contain", MOCK_PROFILE.email);
  });

  it("shows vendor city in profile card", () => {
    cy.get('[data-testid="vendor-profile-card"]').should("contain", MOCK_PROFILE.city);
  });
});

// ── Suite 7: Sidebar navigation ───────────────────────────────────────────────

describe("Vendor Dashboard — sidebar navigation", () => {
  beforeEach(() => {
    vendorLogin();
    interceptDashboard();
    cy.visit("/vendor");
    cy.wait(["@getStats", "@getProfile", "@getAnalytics"]);
  });

  it("desktop sidebar is visible", () => {
    cy.get("aside").should("be.visible");
  });

  it("sidebar contains Products link", () => {
    cy.get("aside").contains("Products").should("exist");
  });

  it("sidebar contains Orders link", () => {
    cy.get("aside").contains("Orders").should("exist");
  });

  it("sidebar contains Profile link", () => {
    cy.get("aside").contains("Profile").should("exist");
  });

  it("sidebar contains Logout button", () => {
    cy.get("aside").contains("Logout").should("exist");
  });
});

// ── Suite 8: Auth guard ───────────────────────────────────────────────────────

describe("Vendor Dashboard — auth guard", () => {
  it("unauthenticated user is redirected to /login", () => {
    cy.visit("/vendor");
    cy.url().should("include", "/login");
  });
});

// ── Suite 9: API auth guards ──────────────────────────────────────────────────

describe("Vendor Dashboard API — auth guards", () => {
  it("GET /api/vendor/stats returns 401 when unauthenticated", () => {
    cy.request({
      method:           "GET",
      url:              "/api/vendor/stats",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("GET /api/vendor/analytics returns 401 when unauthenticated", () => {
    cy.request({
      method:           "GET",
      url:              "/api/vendor/analytics",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});
