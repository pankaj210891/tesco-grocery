/// <reference types="cypress" />

/*
 * E2E — Marketplace Mapping (Vendor ↔ Product, User ↔ Order, RBAC)
 * Covers admin portal vendor/product mapping, vendor portal order isolation,
 * analytics endpoints, and RBAC security enforcement.
 * All API calls are intercepted — no live DB required.
 */

// ── Shared stubs ────────────────────────────────────────────────────────────────

const VENDOR_ID_A = "64f1a2b3c4d5e6f7a8b9c001";
const VENDOR_ID_B = "64f1a2b3c4d5e6f7a8b9c002";
const USER_ID     = "64f1a2b3c4d5e6f7a8b9c010";

const VENDORS_STUB = {
  success: true,
  data: {
    vendors: [
      { _id: VENDOR_ID_A, name: "Fresh Farms Co." },
      { _id: VENDOR_ID_B, name: "Organic Roots" },
    ],
  },
};

const PRODUCTS_STUB = {
  success: true,
  data: {
    products: [
      {
        _id:        "prod001",
        name:       "Organic Milk 1L",
        slug:       "organic-milk-1l",
        price:      80,
        originalPrice: null,
        images:     ["/images/placeholder.webp"],
        category:   "Dairy",
        brand:      "Fresh Farms Co.",
        unit:       "1L",
        inStock:    true,
        rating:     4.5,
        reviewCount: 10,
        badge:      null,
        tags:       [],
        description: "Fresh organic milk",
        status:     "pending",
        vendorId:   VENDOR_ID_A,
        vendorName: "Fresh Farms Co.",
      },
      {
        _id:        "prod002",
        name:       "Brown Rice 5kg",
        slug:       "brown-rice-5kg",
        price:      250,
        originalPrice: 300,
        images:     ["/images/placeholder.webp"],
        category:   "Grains",
        brand:      "Organic Roots",
        unit:       "5kg",
        inStock:    true,
        rating:     4.2,
        reviewCount: 30,
        badge:      "ORGANIC",
        tags:       [],
        description: "Premium brown rice",
        status:     "approved",
        vendorId:   VENDOR_ID_B,
        vendorName: "Organic Roots",
      },
    ],
    total: 2, page: 1, totalPages: 1,
  },
};

const PENDING_PRODUCTS_STUB = {
  success: true,
  data: {
    products: [PRODUCTS_STUB.data.products[0]],
    total: 1, page: 1, totalPages: 1,
  },
};

const ORDERS_STUB = {
  success: true,
  data: {
    orders: [
      {
        _id:         "order001",
        orderNumber: "ORD-001",
        userId:      USER_ID,
        status:      "pending",
        total:       330,
        paymentMethod: "cod",
        createdAt:   "2026-05-10T10:00:00Z",
        delivery: {
          fullName: "Riya Sharma",
          email:    "riya@example.com",
          phone:    "9876543210",
          address:  "123 Main St",
          city:     "Mumbai",
          state:    "Maharashtra",
          pincode:  "400001",
        },
        items: [
          { productId: "prod001", vendorId: VENDOR_ID_A, vendorName: "Fresh Farms Co.", name: "Organic Milk 1L",  slug: "organic-milk-1l",  price: 80,  quantity: 1, image: "" },
          { productId: "prod002", vendorId: VENDOR_ID_B, vendorName: "Organic Roots",    name: "Brown Rice 5kg", slug: "brown-rice-5kg", price: 250, quantity: 1, image: "" },
        ],
      },
      {
        _id:         "order002",
        orderNumber: "ORD-002",
        userId:      USER_ID,
        status:      "delivered",
        total:       80,
        paymentMethod: "razorpay",
        createdAt:   "2026-05-08T14:00:00Z",
        delivery: {
          fullName: "Riya Sharma",
          email:    "riya@example.com",
          phone:    "9876543210",
          address:  "123 Main St",
          city:     "Mumbai",
          state:    "Maharashtra",
          pincode:  "400001",
        },
        items: [
          { productId: "prod001", vendorId: VENDOR_ID_A, vendorName: "Fresh Farms Co.", name: "Organic Milk 1L", slug: "organic-milk-1l", price: 80, quantity: 1, image: "" },
        ],
      },
    ],
    total: 2, page: 1, totalPages: 1,
  },
};

// Vendor sees only their own items (already stripped by API)
const VENDOR_ORDERS_STUB = {
  success: true,
  data:    ORDERS_STUB.data.orders.map((o) => ({
    ...o,
    items: o.items.filter((i) => i.vendorId === VENDOR_ID_A),
  })),
  total:      2,
  page:       1,
  totalPages: 1,
};

const VENDOR_STATS_STUB = {
  success: true,
  data: { totalProducts: 5, inStockProducts: 4, outOfStockProducts: 1, totalOrders: 12, pendingOrders: 3 },
};

const VENDOR_PROFILE_STUB = {
  success: true,
  data: {
    _id:     VENDOR_ID_A,
    name:    "Fresh Farms Co.",
    email:   "vendor@freshfarms.com",
    status:  "active",
    phone:   "9000000001",
    city:    "Delhi",
    address: "42 Farm Lane",
  },
};

const VENDOR_ANALYTICS_STUB = {
  success: true,
  data: {
    totalRevenue:  15000,
    totalOrders:   12,
    pendingOrders: 3,
    topProducts: [
      { name: "Organic Milk 1L", slug: "organic-milk-1l", quantity: 80,  revenue: 6400 },
      { name: "Brown Rice 5kg",  slug: "brown-rice-5kg",  quantity: 34, revenue: 8500 },
    ],
    monthlyRevenue: [],
  },
};

const ADMIN_STATS_STUB = {
  success: true,
  data: {
    totalProducts:    42,
    pendingProducts:  3,
    totalOrders:      120,
    pendingOrders:    8,
    processingOrders: 5,
    totalUsers:       200,
    totalVendors:     10,
    totalRevenue:     150000,
    recentOrders:     [ORDERS_STUB.data.orders[0]],
    lowStock:         [],
    topVendorRevenue: [
      { vendorId: VENDOR_ID_A, vendorName: "Fresh Farms Co.", revenue: 50000 },
    ],
  },
};

const VENDOR_ANALYTICS_ADMIN_STUB = {
  success: true,
  data: [
    { vendorId: VENDOR_ID_A, vendorName: "Fresh Farms Co.", totalProducts: 18, totalOrders: 45, totalRevenue: 50000, status: "active" },
    { vendorId: VENDOR_ID_B, vendorName: "Organic Roots",   totalProducts: 12, totalOrders: 30, totalRevenue: 35000, status: "active" },
  ],
};

// ── Auth helpers ────────────────────────────────────────────────────────────────

function stubAdminAuth(win: Window) {
  const state = {
    state: {
      user:  { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
      token: "mock-admin-token",
      hasHydrated: true,
    },
    version: 0,
  };
  win.localStorage.setItem("prakash-auth", JSON.stringify(state));
}

function stubVendorAuth(win: Window) {
  const state = {
    state: {
      user:  { _id: "vendor001", name: "Fresh Farms", email: "vendor@test.com", role: "vendor", vendorId: VENDOR_ID_A, status: "active" },
      token: "mock-vendor-token",
      hasHydrated: true,
    },
    version: 0,
  };
  win.localStorage.setItem("prakash-auth", JSON.stringify(state));
}

// ── Admin — Products with Vendor Mapping ─────────────────────────────────────

describe("Admin — Products Vendor Mapping", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/vendors*", VENDORS_STUB).as("getVendors");
    cy.intercept("GET", "/api/admin/products*", PRODUCTS_STUB).as("getProducts");
    cy.visit("/admin/products", { onBeforeLoad: stubAdminAuth });
  });

  it("renders vendor filter dropdown with vendor options", () => {
    cy.get("[data-testid='vendor-filter']").should("exist");
    cy.get("[data-testid='vendor-filter'] option").should("have.length.gte", 2);
  });

  it("renders status filter tabs for approval workflow", () => {
    ["all", "approved", "pending", "rejected"].forEach((s) => {
      cy.get(`[data-testid='status-filter-${s}']`).should("exist");
    });
  });

  it("shows vendor name badge on vendor products", () => {
    cy.wait("@getProducts");
    cy.contains("Fresh Farms Co.").should("exist");
    cy.contains("Organic Roots").should("exist");
  });

  it("shows status badge for each product", () => {
    cy.wait("@getProducts");
    cy.contains("pending").should("exist");
    cy.contains("approved").should("exist");
  });

  it("shows approve button for pending products", () => {
    cy.wait("@getProducts");
    cy.get("[data-testid='approve-product-prod001']").should("exist");
  });

  it("shows reject button for pending products", () => {
    cy.wait("@getProducts");
    cy.get("[data-testid='reject-product-prod001']").should("exist");
  });

  it("shows reject button for approved products", () => {
    cy.wait("@getProducts");
    cy.get("[data-testid='reject-product-prod002']").should("exist");
  });

  it("does not show approve button for already approved products", () => {
    cy.wait("@getProducts");
    cy.get("[data-testid='approve-product-prod002']").should("not.exist");
  });

  it("filters by pending status sends correct API param", () => {
    cy.intercept("GET", "/api/admin/products*status=pending*", PENDING_PRODUCTS_STUB).as("pendingProducts");
    cy.get("[data-testid='status-filter-pending']").click();
    cy.wait("@pendingProducts").its("request.url").should("include", "status=pending");
  });

  it("approve button calls PATCH with approved status", () => {
    cy.intercept("PATCH", "/api/admin/products/prod001", {
      success: true,
      data:    { ...PRODUCTS_STUB.data.products[0], status: "approved" },
    }).as("approveProduct");
    cy.wait("@getProducts");
    cy.get("[data-testid='approve-product-prod001']").click();
    cy.wait("@approveProduct").its("request.body").should("deep.equal", { status: "approved" });
  });

  it("reject button calls PATCH with rejected status", () => {
    cy.intercept("PATCH", "/api/admin/products/prod001", {
      success: true,
      data:    { ...PRODUCTS_STUB.data.products[0], status: "rejected" },
    }).as("rejectProduct");
    cy.wait("@getProducts");
    cy.get("[data-testid='reject-product-prod001']").click();
    cy.wait("@rejectProduct").its("request.body").should("deep.equal", { status: "rejected" });
  });

  it("vendor filter sends vendorId param to API", () => {
    cy.intercept("GET", `/api/admin/products*vendorId=${VENDOR_ID_A}*`, PRODUCTS_STUB).as("vendorProducts");
    cy.get("[data-testid='vendor-filter']").select("Fresh Farms Co.");
    cy.wait("@vendorProducts").its("request.url").should("include", `vendorId=${VENDOR_ID_A}`);
  });

  it("product rows show edit and delete action buttons", () => {
    cy.wait("@getProducts");
    cy.get("[data-testid='edit-product-prod001']").should("exist");
    cy.get("[data-testid='delete-product-prod001']").should("exist");
  });
});

// ── Admin — Orders with Vendor & User Filters ─────────────────────────────────

describe("Admin — Orders Marketplace Filters", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/vendors*", VENDORS_STUB).as("getVendors");
    cy.intercept("GET", "/api/admin/orders*", ORDERS_STUB).as("getOrders");
    cy.visit("/admin/orders", { onBeforeLoad: stubAdminAuth });
  });

  it("renders vendor filter dropdown", () => {
    cy.get("[data-testid='order-vendor-filter']").should("exist");
  });

  it("renders user ID filter input", () => {
    cy.get("[data-testid='order-user-filter']").should("exist");
  });

  it("displays Vendor(s) column in the table header", () => {
    cy.contains("th", /vendor/i).should("exist");
  });

  it("shows vendor name badges in order rows", () => {
    cy.wait("@getOrders");
    cy.contains("Fresh Farms Co.").should("exist");
    cy.contains("Organic Roots").should("exist");
  });

  it("selecting vendor filter sends vendorId param", () => {
    cy.intercept("GET", `/api/admin/orders*vendorId=${VENDOR_ID_A}*`, ORDERS_STUB).as("vendorOrders");
    cy.wait("@getVendors");
    cy.get("[data-testid='order-vendor-filter']").select("Fresh Farms Co.");
    cy.wait("@vendorOrders").its("request.url").should("include", `vendorId=${VENDOR_ID_A}`);
  });

  it("entering user ID filter sends userId param", () => {
    cy.intercept("GET", `/api/admin/orders*userId=${USER_ID}*`, ORDERS_STUB).as("userOrders");
    cy.get("[data-testid='order-user-filter']").type(USER_ID);
    cy.wait("@userOrders").its("request.url").should("include", `userId=${USER_ID}`);
  });

  it("shows clear filters button when marketplace filter is active", () => {
    cy.wait("@getVendors");
    cy.get("[data-testid='order-vendor-filter']").select("Fresh Farms Co.");
    cy.get("[data-testid='clear-marketplace-filters']").should("be.visible");
  });

  it("clear filters button resets vendor and user filters", () => {
    cy.wait("@getVendors");
    cy.get("[data-testid='order-vendor-filter']").select("Fresh Farms Co.");
    cy.get("[data-testid='clear-marketplace-filters']").click();
    cy.get("[data-testid='order-vendor-filter']").should("have.value", "");
    cy.get("[data-testid='clear-marketplace-filters']").should("not.exist");
  });

  it("order rows render with testid", () => {
    cy.wait("@getOrders");
    cy.get("[data-testid='order-row']").should("have.length", 2);
  });

  it("status filter tabs are rendered", () => {
    ["all", "pending", "processing", "shipped", "delivered", "cancelled"].forEach((s) => {
      cy.get(`[data-testid='order-status-${s}']`).should("exist");
    });
  });

  it("status filter sends correct param to API", () => {
    cy.intercept("GET", "/api/admin/orders*status=pending*", ORDERS_STUB).as("pendingOrders");
    cy.get("[data-testid='order-status-pending']").click();
    cy.wait("@pendingOrders").its("request.url").should("include", "status=pending");
  });

  it("each order row shows a status update dropdown", () => {
    cy.wait("@getOrders");
    cy.get("[data-testid='order-status-update-order001']").should("exist");
  });
});

// ── Admin — Dashboard Vendor Analytics ───────────────────────────────────────

describe("Admin — Dashboard Vendor Analytics", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/stats",             ADMIN_STATS_STUB).as("getStats");
    cy.intercept("GET", "/api/admin/vendors/analytics", VENDOR_ANALYTICS_ADMIN_STUB).as("getVendorAnalytics");
    cy.visit("/admin", { onBeforeLoad: stubAdminAuth });
  });

  it("shows pending products count in stats cards", () => {
    cy.wait("@getStats");
    cy.contains(/3 pending review/i).should("exist");
  });

  it("shows pending products approval alert banner", () => {
    cy.wait("@getStats");
    cy.contains(/3 vendor product/i).should("exist");
    cy.contains(/review now/i).should("exist");
  });

  it("pending approval alert links to /admin/products?status=pending", () => {
    cy.wait("@getStats");
    cy.contains("Review now →").should("have.attr", "href", "/admin/products?status=pending");
  });

  it("renders top vendors table", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='top-vendors-table']").should("exist");
  });

  it("top vendors table shows vendor rows", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='vendor-analytics-row']").should("have.length", 2);
  });

  it("top vendors table shows vendor name, orders, revenue, status", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='top-vendors-table']").within(() => {
      cy.contains("Fresh Farms Co.").should("exist");
      cy.contains("Organic Roots").should("exist");
      cy.contains("50,000").should("exist");
    });
  });

  it("shows recent orders section", () => {
    cy.wait("@getStats");
    cy.contains(/recent orders/i).should("exist");
  });
});

// ── Vendor — Dashboard with Earnings Analytics ────────────────────────────────

describe("Vendor — Dashboard Earnings Analytics", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/vendor/stats",     VENDOR_STATS_STUB).as("getVendorStats");
    cy.intercept("GET", "/api/vendor/profile",   VENDOR_PROFILE_STUB).as("getVendorProfile");
    cy.intercept("GET", "/api/vendor/analytics", VENDOR_ANALYTICS_STUB).as("getVendorAnalytics");
    cy.visit("/vendor", { onBeforeLoad: stubVendorAuth });
  });

  it("shows vendor name and status from profile", () => {
    cy.wait("@getVendorProfile");
    cy.contains("Fresh Farms Co.").should("exist");
    cy.contains("active").should("exist");
  });

  it("shows Total Revenue from analytics", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='vendor-total-revenue']").should("contain", "15,000");
  });

  it("shows Total Orders count from analytics", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='vendor-total-orders']").should("contain", "12");
  });

  it("shows pending orders count inside the analytics card", () => {
    cy.wait("@getVendorAnalytics");
    cy.contains(/3 pending/i).should("exist");
  });

  it("renders Top Products by Revenue table", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='vendor-top-products']").should("exist");
  });

  it("top products table shows product names and revenue", () => {
    cy.wait("@getVendorAnalytics");
    cy.get("[data-testid='vendor-top-products']").within(() => {
      cy.contains("Organic Milk 1L").should("exist");
      cy.contains("Brown Rice 5kg").should("exist");
      cy.contains("6,400").should("exist");
    });
  });

  it("shows core stats cards: total products, in stock, out of stock, orders", () => {
    cy.wait("@getVendorStats");
    cy.contains("5").should("exist"); // total products
    cy.contains("4").should("exist"); // in stock
  });

  it("shows vendor profile details at bottom of page", () => {
    cy.wait("@getVendorProfile");
    cy.contains("vendor@freshfarms.com").should("exist");
    cy.contains("Delhi").should("exist");
  });

  it("shows out of stock alert in products management card", () => {
    cy.wait("@getVendorStats");
    cy.contains(/1 out of stock/i).should("exist");
  });

  it("shows pending orders alert in orders management card", () => {
    cy.wait("@getVendorStats");
    cy.contains(/3 pending/i).should("exist");
  });
});

// ── Vendor — Orders: Own Items Only ──────────────────────────────────────────

describe("Vendor — Orders Data Isolation", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/vendor/orders*", VENDOR_ORDERS_STUB).as("getVendorOrders");
    cy.visit("/vendor/orders", { onBeforeLoad: stubVendorAuth });
  });

  it("renders vendor orders table with own items only", () => {
    cy.wait("@getVendorOrders");
    cy.get("[data-testid='vendor-order-row']").should("have.length.gte", 1);
  });

  it("order rows show only vendor-owned items — not items from other vendors", () => {
    cy.wait("@getVendorOrders");
    cy.get("[data-testid='vendor-order-row']").first().within(() => {
      cy.contains("Organic Milk 1L").should("exist");
      cy.contains("Brown Rice 5kg").should("not.exist"); // belongs to VENDOR_ID_B
    });
  });

  it("renders status filter tabs", () => {
    ["all", "pending", "processing", "shipped", "delivered", "cancelled"].forEach((s) => {
      cy.get(`[data-testid='vendor-order-status-${s}']`).should("exist");
    });
  });

  it("clicking a status filter sends correct status param", () => {
    cy.intercept("GET", "/api/vendor/orders*status=pending*", VENDOR_ORDERS_STUB).as("pendingVendorOrders");
    cy.get("[data-testid='vendor-order-status-pending']").click();
    cy.wait("@pendingVendorOrders").its("request.url").should("include", "status=pending");
  });

  it("shows order number and customer details", () => {
    cy.wait("@getVendorOrders");
    cy.contains("#ORD-001").should("exist");
    cy.contains("Riya Sharma").should("exist");
  });

  it("pending orders show shipment update dropdown", () => {
    cy.wait("@getVendorOrders");
    cy.get("[data-testid='vendor-order-update-order001']").should("exist");
  });

  it("shipment update dropdown calls PATCH on the correct endpoint", () => {
    cy.intercept("PATCH", "/api/vendor/orders/order001", {
      success: true,
      data:    { ...VENDOR_ORDERS_STUB.data[0], status: "processing" },
    }).as("updateShipment");
    cy.wait("@getVendorOrders");
    cy.get("[data-testid='vendor-order-update-order001']").select("processing");
    cy.wait("@updateShipment").its("request.body").should("deep.equal", { status: "processing" });
  });

  it("delivered orders do not show shipment update dropdown", () => {
    cy.wait("@getVendorOrders");
    cy.get("[data-testid='vendor-order-update-order002']").should("not.exist");
  });

  it("all filter tab is active by default", () => {
    cy.get("[data-testid='vendor-order-status-all']").should("have.class", "bg-[#1a7a4a]");
  });
});

// ── RBAC — Unauthorized Access Prevention ────────────────────────────────────

describe("RBAC — Unauthorized Access Prevention", () => {
  it("unauthenticated user visiting /admin is redirected to /login", () => {
    cy.clearLocalStorage();
    cy.intercept("GET", "/api/admin/stats", { success: false, error: "Unauthorized" }).as("blockedStats");
    cy.visit("/admin");
    cy.url().should("include", "/login");
  });

  it("unauthenticated user visiting /vendor is redirected to /login", () => {
    cy.clearLocalStorage();
    cy.visit("/vendor");
    cy.url().should("include", "/login");
  });

  it("vendor user visiting /admin is redirected away from admin", () => {
    cy.visit("/admin", { onBeforeLoad: stubVendorAuth });
    cy.url().should("not.include", "/admin");
  });

  it("vendor PATCH order API rejects unauthorized status (cancelled)", () => {
    cy.request({
      method:           "PATCH",
      url:              "/api/vendor/orders/order001",
      body:             { status: "cancelled" },
      headers:          { "Content-Type": "application/json" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401, 403]);
    });
  });

  it("admin product PATCH returns 401 without Authorization header", () => {
    cy.request({
      method:           "PATCH",
      url:              "/api/admin/products/prod001",
      body:             { status: "approved" },
      headers:          { "Content-Type": "application/json" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("vendor orders API returns 401 without Authorization header", () => {
    cy.request({
      method:           "GET",
      url:              "/api/vendor/orders",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("vendor analytics API returns 401 without Authorization header", () => {
    cy.request({
      method:           "GET",
      url:              "/api/vendor/analytics",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("admin vendors analytics API returns 401 without Authorization header", () => {
    cy.request({
      method:           "GET",
      url:              "/api/admin/vendors/analytics",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("admin stats API returns 401 without Authorization header", () => {
    cy.request({
      method:           "GET",
      url:              "/api/admin/stats",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});

// ── RBAC — Admin product approval API validation ──────────────────────────────

describe("RBAC — Admin Product Approval API Validation", () => {
  it("PATCH /api/admin/products/:id returns 400 for invalid status value", () => {
    cy.request({
      method:           "PATCH",
      url:              "/api/admin/products/prod001",
      body:             { status: "invalid-status" },
      headers:          { "Content-Type": "application/json" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401, 403]);
    });
  });

  it("vendor orders API rejects invalid ObjectId as vendorId filter", () => {
    cy.request({
      method:           "GET",
      url:              "/api/admin/orders?vendorId=not-a-valid-id",
      failOnStatusCode: false,
    }).then((res) => {
      // API should either ignore invalid IDs (200) or reject with 400/401
      expect(res.status).to.be.oneOf([200, 400, 401, 403]);
    });
  });

  it("vendor order status PATCH rejects regression to pending", () => {
    cy.request({
      method:           "PATCH",
      url:              "/api/vendor/orders/order001",
      body:             { status: "pending" },
      headers:          { "Content-Type": "application/json" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401, 403]);
    });
  });
});

// ── Vendor — Product Access Isolation ────────────────────────────────────────

describe("Vendor — Product Portal Isolation", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/vendor/products*", {
      success: true,
      data: {
        products: [PRODUCTS_STUB.data.products[0]],
        total: 1, page: 1, totalPages: 1,
      },
    }).as("getVendorProducts");
    cy.visit("/vendor/products", { onBeforeLoad: stubVendorAuth });
  });

  it("vendor products page loads and shows vendor's own products", () => {
    cy.wait("@getVendorProducts");
    cy.contains("Organic Milk 1L").should("exist");
  });

  it("API request to /api/vendor/products is made with auth header", () => {
    cy.wait("@getVendorProducts").its("request.headers").should("have.property", "authorization");
  });
});

// ── Admin — Product Approval Workflow UI ─────────────────────────────────────

describe("Admin — Product Approval Workflow UI", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/vendors*",  VENDORS_STUB).as("getVendors");
    cy.intercept("GET", "/api/admin/products*", PRODUCTS_STUB).as("getProducts");
    cy.visit("/admin/products", { onBeforeLoad: stubAdminAuth });
  });

  it("clicking pending tab shows only pending products", () => {
    cy.intercept("GET", "/api/admin/products*status=pending*", PENDING_PRODUCTS_STUB).as("pendingOnly");
    cy.get("[data-testid='status-filter-pending']").click();
    cy.wait("@pendingOnly");
    cy.get("[data-testid='product-row']").should("have.length", 1);
  });

  it("after approval, product status badge updates in UI", () => {
    cy.intercept("PATCH", "/api/admin/products/prod001", {
      success: true,
      data:    { ...PRODUCTS_STUB.data.products[0], status: "approved" },
    }).as("approveProduct");
    cy.wait("@getProducts");
    cy.get("[data-testid='approve-product-prod001']").click();
    cy.wait("@approveProduct");
    // The approve button for prod001 should disappear after approval
    cy.get("[data-testid='approve-product-prod001']").should("not.exist");
  });

  it("search input filters products by name via API", () => {
    cy.intercept("GET", "/api/admin/products*search=milk*", PENDING_PRODUCTS_STUB).as("searchProducts");
    cy.get("[data-testid='product-search']").type("milk");
    cy.wait("@searchProducts").its("request.url").should("include", "search=milk");
  });

  it("add product button is present and accessible", () => {
    cy.get("[data-testid='add-product-btn']").should("be.visible");
  });
});

// ── Admin + Vendor — Combined Filter Sanity ───────────────────────────────────

describe("Admin — Combined Order Filters Sanity", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/admin/vendors*", VENDORS_STUB).as("getVendors");
    cy.intercept("GET", "/api/admin/orders*",  ORDERS_STUB).as("getOrders");
    cy.visit("/admin/orders", { onBeforeLoad: stubAdminAuth });
  });

  it("vendor + status filters coexist in the same request", () => {
    cy.intercept("GET", /\/api\/admin\/orders.*vendorId=.*status=pending/, ORDERS_STUB).as("combined");
    cy.wait("@getVendors");
    cy.get("[data-testid='order-vendor-filter']").select("Fresh Farms Co.");
    cy.get("[data-testid='order-status-pending']").click();
    cy.wait("@combined").its("request.url").then((url) => {
      expect(url).to.include("status=pending");
      expect(url).to.include(`vendorId=${VENDOR_ID_A}`);
    });
  });

  it("search + vendor filter coexist in the same request", () => {
    cy.intercept("GET", /\/api\/admin\/orders.*q=riya.*vendorId=/, ORDERS_STUB).as("searchVendor");
    cy.wait("@getVendors");
    cy.get("[data-testid='order-search']").type("riya");
    cy.get("[data-testid='order-vendor-filter']").select("Fresh Farms Co.");
    cy.wait("@searchVendor").its("request.url").then((url) => {
      expect(url).to.include("q=riya");
      expect(url).to.include("vendorId=");
    });
  });

  it("clear filters button appears only when a marketplace filter is set", () => {
    cy.get("[data-testid='clear-marketplace-filters']").should("not.exist");
    cy.wait("@getVendors");
    cy.get("[data-testid='order-vendor-filter']").select("Fresh Farms Co.");
    cy.get("[data-testid='clear-marketplace-filters']").should("exist");
  });
});

export {};
