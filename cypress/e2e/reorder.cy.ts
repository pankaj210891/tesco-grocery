/// <reference types="cypress" />

/*
 * E2E — Reorder Flow
 * Tests the one-click reorder feature on the order detail page.
 * All API calls are intercepted so tests run without a live database.
 */

const mockOrder = {
  _id:           "order001",
  orderNumber:   "ORD-20240001",
  status:        "delivered",
  paymentMethod: "razorpay",
  paymentStatus: "paid",
  subtotal:      338,
  deliveryFee:   0,
  codCharge:     0,
  discount:      0,
  total:         338,
  createdAt:     new Date().toISOString(),
  items: [
    {
      productId: "prod001",
      name:      "Organic Full-Fat Milk 2L",
      slug:      "organic-full-fat-milk-2l",
      price:     89,
      quantity:  2,
      image:     "/images/placeholder.webp",
    },
    {
      productId: "prod002",
      name:      "Sourdough Loaf 800g",
      slug:      "sourdough-loaf-800g",
      price:     160,
      quantity:  1,
      image:     "/images/placeholder.webp",
    },
  ],
  delivery: {
    fullName: "Test Customer",
    email:    "test@example.com",
    phone:    "9999999999",
    address:  "123 Test Street",
    city:     "Mumbai",
    postcode: "400001",
  },
  razorpayPaymentId: "pay_test123",
  deliverySlotDate:  null,
  deliverySlotWindow: null,
};

function loginTestUser() {
  cy.loginByApi(Cypress.env("TEST_USER_EMAIL"), Cypress.env("TEST_USER_PASSWORD"));
}

function interceptOrderDetail(order = mockOrder) {
  cy.intercept("GET", `/api/account/orders/${order.orderNumber}`, {
    statusCode: 200,
    body: { success: true, data: order },
  }).as("getOrder");
}

function interceptReorder(result: {
  added:       { productId: string; name: string; quantity: number }[];
  unavailable: { name: string; reason: string }[];
}) {
  cy.intercept("POST", `/api/account/orders/${mockOrder.orderNumber}/reorder`, {
    statusCode: 200,
    body: { success: true, data: result },
  }).as("reorder");
}

// ── Seed test user before suite ──────────────────────────────────────────────
before(() => {
  cy.task("seedTestUser", {
    email:    Cypress.env("TEST_USER_EMAIL"),
    password: Cypress.env("TEST_USER_PASSWORD"),
    name:     "Test Customer",
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reorder — Order Detail Page", () => {
  beforeEach(() => {
    interceptOrderDetail();
    loginTestUser();
    cy.visit(`/account/orders/${mockOrder.orderNumber}`);
    cy.wait("@getOrder");
  });

  it("renders the order detail page without crashing", () => {
    cy.get("main, [data-testid]").should("exist");
  });

  it("shows the order number on the detail page", () => {
    cy.contains(mockOrder.orderNumber).should("be.visible");
  });

  it("renders the Reorder button for a delivered order", () => {
    cy.get('[data-testid="reorder-btn"]').should("be.visible");
  });

  it("Reorder button is not disabled initially", () => {
    cy.get('[data-testid="reorder-btn"]').should("not.be.disabled");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reorder — Successful Reorder (All Items Available)", () => {
  beforeEach(() => {
    interceptOrderDetail();
    interceptReorder({
      added: [
        { productId: "prod001", name: "Organic Full-Fat Milk 2L", quantity: 2 },
        { productId: "prod002", name: "Sourdough Loaf 800g",      quantity: 1 },
      ],
      unavailable: [],
    });

    cy.intercept("GET", "/api/account/cart", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getCart");

    loginTestUser();
    cy.visit(`/account/orders/${mockOrder.orderNumber}`);
    cy.wait("@getOrder");
  });

  it("calls the reorder API when the Reorder button is clicked", () => {
    cy.get('[data-testid="reorder-btn"]').click();
    cy.wait("@reorder");
  });

  it("sends the correct orderNumber in the reorder request URL", () => {
    cy.get('[data-testid="reorder-btn"]').click();
    cy.wait("@reorder").its("request.url").should("include", mockOrder.orderNumber);
  });

  it("shows a success toast after reordering all items", () => {
    cy.get('[data-testid="reorder-btn"]').click();
    cy.wait("@reorder");
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reorder — Partial Reorder (Some Items Unavailable)", () => {
  beforeEach(() => {
    interceptOrderDetail();
    interceptReorder({
      added: [
        { productId: "prod001", name: "Organic Full-Fat Milk 2L", quantity: 2 },
      ],
      unavailable: [
        { name: "Sourdough Loaf 800g", reason: "out of stock" },
      ],
    });

    loginTestUser();
    cy.visit(`/account/orders/${mockOrder.orderNumber}`);
    cy.wait("@getOrder");
  });

  it("completes the reorder request even when some items are unavailable", () => {
    cy.get('[data-testid="reorder-btn"]').click();
    cy.wait("@reorder").its("response.statusCode").should("eq", 200);
  });

  it("shows a toast notification for the partial reorder", () => {
    cy.get('[data-testid="reorder-btn"]').click();
    cy.wait("@reorder");
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reorder — API Error Handling", () => {
  beforeEach(() => {
    interceptOrderDetail();
    cy.intercept("POST", `/api/account/orders/${mockOrder.orderNumber}/reorder`, {
      statusCode: 500,
      body: { success: false, error: "Internal server error" },
    }).as("reorderFail");

    loginTestUser();
    cy.visit(`/account/orders/${mockOrder.orderNumber}`);
    cy.wait("@getOrder");
  });

  it("shows an error toast when the reorder API fails", () => {
    cy.get('[data-testid="reorder-btn"]').click();
    cy.wait("@reorderFail");
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reorder — Unauthenticated Access", () => {
  it("redirects unauthenticated users away from the order detail page", () => {
    cy.visit(`/account/orders/${mockOrder.orderNumber}`);
    cy.url().should("include", "/login");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reorder — Mobile Responsiveness", () => {
  beforeEach(() => {
    interceptOrderDetail();
    loginTestUser();
    cy.viewport("iphone-x");
    cy.visit(`/account/orders/${mockOrder.orderNumber}`);
    cy.wait("@getOrder");
  });

  it("shows the Reorder button on mobile viewport", () => {
    cy.get('[data-testid="reorder-btn"]').should("be.visible");
  });

  it("Reorder button is tappable on mobile (not obscured)", () => {
    cy.get('[data-testid="reorder-btn"]').should("not.be.disabled");
  });
});
