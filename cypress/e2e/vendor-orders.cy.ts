/**
 * E2E: Vendor Orders Page (/vendor/orders)
 *
 * Covers:
 *  - Page renders heading and total count
 *  - Status filter buttons rendered for all statuses
 *  - Active filter is highlighted
 *  - Clicking a filter button re-fetches orders with that status
 *  - Table renders order rows with order number, customer, status badge
 *  - Items column shows product name × quantity
 *  - Status update select fires PATCH to /api/vendor/orders/:id
 *  - Delivered/cancelled orders do not show update select
 *  - Empty state shows "No orders yet" when list is empty
 *  - Pagination controls shown when totalPages > 1
 *  - Prev/Next pagination buttons call setOrdersPage
 *  - Unauthenticated user is redirected to /login
 *  - API auth guards: GET /api/vendor/orders returns 401
 *  - API auth guards: PATCH /api/vendor/orders/:id returns 401
 */

const VENDOR_EMAIL    = Cypress.env("VENDOR_EMAIL")    ?? "vendor@example.com";
const VENDOR_PASSWORD = Cypress.env("VENDOR_PASSWORD") ?? "Test@1234";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id:         "order001",
    orderNumber: "ORD-2025-001",
    status:      "pending",
    createdAt:   new Date().toISOString(),
    delivery: {
      fullName: "Priya Sharma",
      email:    "priya@example.com",
      phone:    "+91 99999 00001",
      address:  "5 Patel Nagar",
      city:     "Delhi",
      postcode: "110001",
    },
    items: [
      { productId: "prod001", vendorId: "vendor001", name: "Organic Whole Milk", slug: "organic-whole-milk", price: 89, quantity: 2, image: "" },
      { productId: "prod002", vendorId: "vendor001", name: "Brown Eggs 6pcs",    slug: "brown-eggs-6",       price: 65, quantity: 1, image: "" },
    ],
    subtotal:    243,
    deliveryFee: 0,
    codCharge:   0,
    discount:    0,
    total:       243,
    paymentMethod: "cod",
    paymentStatus: "pending",
    ...overrides,
  };
}

const MOCK_ORDERS_RESPONSE = {
  success: true,
  data: {
    data:       [makeOrder()],
    total:      1,
    page:       1,
    totalPages: 1,
  },
};

const MOCK_ORDERS_MULTI_PAGE = {
  success: true,
  data: {
    data:       [makeOrder(), makeOrder({ _id: "order002", orderNumber: "ORD-2025-002" })],
    total:      40,
    page:       1,
    totalPages: 2,
  },
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

function interceptOrders(body = MOCK_ORDERS_RESPONSE) {
  cy.intercept("GET", "/api/vendor/orders*", { body }).as("getOrders");
}

// ── Suite 1: Page rendering ───────────────────────────────────────────────────

describe("Vendor Orders page — rendering", () => {
  beforeEach(() => {
    vendorLogin();
    interceptOrders();
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");
  });

  it("shows the My Orders heading", () => {
    cy.contains("h1", "My Orders").should("be.visible");
  });

  it("renders all status filter buttons", () => {
    const statuses = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];
    statuses.forEach((s) => {
      cy.get(`[data-testid="vendor-order-status-${s}"]`).should("exist");
    });
  });

  it("'all' filter is active by default", () => {
    cy.get('[data-testid="vendor-order-status-all"]')
      .should("have.class", "bg-[#1a7a4a]");
  });

  it("shows table column headers", () => {
    cy.contains("th", "Order").should("be.visible");
    cy.contains("th", "Customer").should("be.visible");
    cy.contains("th", "Status").should("be.visible");
    cy.contains("th", "Update Shipment").should("be.visible");
  });
});

// ── Suite 2: Orders table rows ────────────────────────────────────────────────

describe("Vendor Orders page — table rows", () => {
  beforeEach(() => {
    vendorLogin();
    interceptOrders();
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");
  });

  it("renders one row per order", () => {
    cy.get('[data-testid="vendor-order-row"]').should("have.length", 1);
  });

  it("shows the order number in the row", () => {
    cy.get('[data-testid="vendor-order-row"]').first().should("contain", "ORD-2025-001");
  });

  it("shows the customer name in the row", () => {
    cy.get('[data-testid="vendor-order-row"]').first().should("contain", "Priya Sharma");
  });

  it("shows the customer email in the row", () => {
    cy.get('[data-testid="vendor-order-row"]').first().should("contain", "priya@example.com");
  });

  it("shows the delivery city in the row", () => {
    cy.get('[data-testid="vendor-order-row"]').first().should("contain", "Delhi");
  });

  it("shows the order status badge", () => {
    cy.get('[data-testid="vendor-order-row"]').first().contains("span", "pending").should("be.visible");
  });

  it("shows line items with name and quantity", () => {
    cy.get('[data-testid="vendor-order-row"]').first()
      .should("contain", "Organic Whole Milk ×2");
  });

  it("shows the shipment update select for pending orders", () => {
    cy.get('[data-testid="vendor-order-update-order001"]').should("exist");
  });
});

// ── Suite 3: Status filter ────────────────────────────────────────────────────

describe("Vendor Orders page — status filter", () => {
  beforeEach(() => {
    vendorLogin();
    interceptOrders();
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");
  });

  it("clicking 'pending' filter re-fetches with status=pending", () => {
    cy.intercept("GET", "/api/vendor/orders*status=pending*", { body: MOCK_ORDERS_RESPONSE }).as("getPending");
    cy.get('[data-testid="vendor-order-status-pending"]').click();
    cy.wait("@getPending");
  });

  it("clicking 'shipped' filter re-fetches with status=shipped", () => {
    cy.intercept("GET", "/api/vendor/orders*status=shipped*", { body: { ...MOCK_ORDERS_RESPONSE, data: { ...MOCK_ORDERS_RESPONSE.data, data: [], total: 0 } } }).as("getShipped");
    cy.get('[data-testid="vendor-order-status-shipped"]').click();
    cy.wait("@getShipped");
  });

  it("active filter button has green background", () => {
    cy.get('[data-testid="vendor-order-status-pending"]').click();
    cy.get('[data-testid="vendor-order-status-pending"]').should("have.class", "bg-[#1a7a4a]");
  });
});

// ── Suite 4: Status update select ────────────────────────────────────────────

describe("Vendor Orders page — status update", () => {
  beforeEach(() => {
    vendorLogin();
    interceptOrders();
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");
  });

  it("changing the select triggers PATCH to /api/vendor/orders/:id", () => {
    cy.intercept("PATCH", "/api/vendor/orders/order001", {
      statusCode: 200,
      body: { success: true },
    }).as("patchOrder");

    cy.get('[data-testid="vendor-order-update-order001"]').select("processing");
    cy.wait("@patchOrder");
  });

  it("no update select is shown for delivered orders", () => {
    interceptOrders({
      success: true,
      data: { data: [makeOrder({ _id: "orderD", status: "delivered" })], total: 1, page: 1, totalPages: 1 },
    });
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");

    cy.get('[data-testid="vendor-order-update-orderD"]').should("not.exist");
  });

  it("no update select is shown for cancelled orders", () => {
    interceptOrders({
      success: true,
      data: { data: [makeOrder({ _id: "orderC", status: "cancelled" })], total: 1, page: 1, totalPages: 1 },
    });
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");

    cy.get('[data-testid="vendor-order-update-orderC"]').should("not.exist");
  });
});

// ── Suite 5: Empty state ──────────────────────────────────────────────────────

describe("Vendor Orders page — empty state", () => {
  it("shows 'No orders yet' when list is empty", () => {
    vendorLogin();
    interceptOrders({
      success: true,
      data: { data: [], total: 0, page: 1, totalPages: 1 },
    });
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");

    cy.contains("No orders yet").should("be.visible");
  });
});

// ── Suite 6: Pagination ───────────────────────────────────────────────────────

describe("Vendor Orders page — pagination", () => {
  beforeEach(() => {
    vendorLogin();
    interceptOrders(MOCK_ORDERS_MULTI_PAGE);
    cy.visit("/vendor/orders");
    cy.wait("@getOrders");
  });

  it("shows pagination info when totalPages > 1", () => {
    cy.contains("Page 1 of 2").should("be.visible");
    cy.contains("40 orders").should("be.visible");
  });

  it("prev button is disabled on page 1", () => {
    cy.get("button").filter("[disabled]").first().should("exist");
  });

  it("next button navigates to page 2", () => {
    cy.intercept("GET", "/api/vendor/orders*page=2*", { body: { ...MOCK_ORDERS_MULTI_PAGE, data: { ...MOCK_ORDERS_MULTI_PAGE.data, page: 2 } } }).as("getPage2");
    cy.get("button").filter(":not([disabled])").last().click();
    cy.wait("@getPage2");
  });
});

// ── Suite 7: Auth guard ───────────────────────────────────────────────────────

describe("Vendor Orders page — auth guard", () => {
  it("unauthenticated user is redirected to /login", () => {
    cy.visit("/vendor/orders");
    cy.url().should("include", "/login");
  });
});

// ── Suite 8: API auth guards ──────────────────────────────────────────────────

describe("Vendor Orders API — auth guards", () => {
  it("GET /api/vendor/orders returns 401 when unauthenticated", () => {
    cy.request({
      method:           "GET",
      url:              "/api/vendor/orders",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("PATCH /api/vendor/orders/:id returns 401 when unauthenticated", () => {
    cy.request({
      method:           "PATCH",
      url:              "/api/vendor/orders/order001",
      body:             { status: "processing" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});
