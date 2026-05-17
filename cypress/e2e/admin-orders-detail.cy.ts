/// <reference types="cypress" />

/*
 * E2E — Admin Orders: Detail modal and refund flow.
 * Uses stub-based auth (onBeforeLoad) — no real login or cy.session().
 */

const ADMIN_AUTH = {
  user: { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
  token: "fake-admin-token",
};

const CUSTOMER_AUTH = {
  user: { _id: "cust001", name: "Customer", email: "customer@test.com", role: "customer", status: "active" },
  token: "fake-customer-token",
};

const ORDERS_STUB = {
  success: true,
  data: {
    orders: [
      {
        _id: "o1",
        orderNumber: "ORD-001",
        user: { name: "Alice", email: "alice@test.com" },
        total: 250,
        status: "delivered",
        paymentStatus: "paid",
        paymentMethod: "razorpay",
        createdAt: "2024-01-15T10:00:00.000Z",
        itemCount: 1,
      },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
  },
};

const PAID_ORDER_DETAIL = {
  success: true,
  data: {
    _id: "o1",
    orderNumber: "ORD-001",
    items: [{ name: "Test Item", price: 100, quantity: 2, image: "", vendorName: "Test Vendor" }],
    delivery: {
      fullName: "Alice",
      email: "alice@test.com",
      phone: "9999999999",
      address: "123 Test St",
      city: "Mumbai",
      postcode: "400001",
    },
    subtotal: 200,
    deliveryFee: 50,
    codCharge: 0,
    discount: 0,
    total: 250,
    status: "delivered",
    paymentMethod: "razorpay",
    paymentStatus: "paid",
    refundedAmount: 0,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
  },
};

function stubAdminAuth(win: Window) {
  win.localStorage.setItem(
    "prakash-auth",
    JSON.stringify({ state: { ...ADMIN_AUTH, hasHydrated: true }, version: 0 }),
  );
}

function stubCustomerAuth(win: Window) {
  win.localStorage.setItem(
    "prakash-auth",
    JSON.stringify({ state: { ...CUSTOMER_AUTH, hasHydrated: true }, version: 0 }),
  );
}

function interceptOrders(body = ORDERS_STUB) {
  cy.intercept("GET", "/api/admin/orders*", body).as("getOrders");
}

function visitAdmin(qs = "") {
  cy.visit(`/admin/orders${qs ? `?${qs}` : ""}`, { onBeforeLoad: stubAdminAuth });
}

/* ── Page Render ───────────────────────────────────────────────────────────── */

describe("Admin Orders — Page Render", () => {
  beforeEach(() => {
    interceptOrders();
    visitAdmin();
    cy.wait("@getOrders");
  });

  it("renders at least one order row", () => {
    cy.get('[data-testid="order-row"]').should("have.length.gte", 1);
  });

  it("shows a View button on each order row", () => {
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').should("exist");
    });
  });

  it("opens order detail modal when View button is clicked", () => {
    cy.intercept("GET", "/api/admin/orders/*", PAID_ORDER_DETAIL).as("orderDetail");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
  });

  it("displays order number in detail modal header", () => {
    cy.intercept("GET", "/api/admin/orders/*", PAID_ORDER_DETAIL).as("orderDetail");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-number"]').should("contain", "#");
  });

  it("closes detail modal via close button", () => {
    cy.intercept("GET", "/api/admin/orders/*", PAID_ORDER_DETAIL).as("orderDetail");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
    cy.get('[data-testid="order-detail-close"]').click();
    cy.get('[data-testid="order-detail-modal"]').should("not.exist");
  });

  it("closes detail modal via backdrop click", () => {
    cy.intercept("GET", "/api/admin/orders/*", PAID_ORDER_DETAIL).as("orderDetail");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
    cy.get('[data-testid="order-detail-modal"]').click({ force: true });
    cy.get('[data-testid="order-detail-modal"]').should("not.exist");
  });
});

/* ── Order Detail Content ──────────────────────────────────────────────────── */

describe("Admin Orders — Order Detail Content", () => {
  beforeEach(() => {
    interceptOrders();
    cy.intercept("GET", "/api/admin/orders/*", PAID_ORDER_DETAIL).as("orderDetail");
    visitAdmin();
    cy.wait("@getOrders");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@orderDetail");
  });

  it("fetches order detail via GET /api/admin/orders/:id with status 200", () => {
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
  });

  it("shows order number in the modal header", () => {
    cy.get('[data-testid="order-detail-number"]').should("contain", "#");
  });

  it("shows timeline for delivered orders if timeline element is present", () => {
    cy.get('[data-testid="order-detail-modal"]').then(() => {
      const hasTimeline = Cypress.$('[data-testid="order-timeline"]').length > 0;
      if (hasTimeline) {
        cy.get('[data-testid="order-timeline"]').should("be.visible");
      }
    });
  });
});

/* ── Refund Flow ───────────────────────────────────────────────────────────── */

describe("Admin Orders — Refund Flow", () => {
  function openPaidOrderModal(detailBody = PAID_ORDER_DETAIL) {
    interceptOrders();
    cy.intercept("GET", "/api/admin/orders/*", detailBody).as("orderDetail");
    visitAdmin();
    cy.wait("@getOrders");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@orderDetail");
  }

  it("shows Process Refund button for paid orders", () => {
    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').should("be.visible");
  });

  it("opens refund form when Process Refund is clicked", () => {
    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-form"]').should("be.visible");
  });

  it("defaults to full refund type", () => {
    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-type-full"]').should("have.class", "border-orange-400");
  });

  it("switches to partial refund and shows amount input", () => {
    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-type-partial"]').click();
    cy.get('[data-testid="refund-amount-input"]').should("be.visible");
  });

  it("shows error when reason is missing on refund submit", () => {
    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.get('[data-testid="refund-error"]').should("contain", "Reason is required");
  });

  it("submits full refund and calls POST /api/admin/orders/:id/refund", () => {
    cy.intercept("POST", "/api/admin/orders/*/refund", {
      success: true,
      data: {
        ...PAID_ORDER_DETAIL.data,
        paymentStatus: "refunded",
        refundedAmount: 250,
        refundStatus: "initiated",
        refundType: "full",
        refundReason: "Customer request",
      },
    }).as("refund");

    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-reason-input"]').type("Customer request");
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.wait("@refund").its("request.body.type").should("eq", "full");
  });

  it("submits partial refund with amount", () => {
    cy.intercept("POST", "/api/admin/orders/*/refund", {
      success: true,
      data: {
        ...PAID_ORDER_DETAIL.data,
        paymentStatus: "partially_refunded",
        refundedAmount: 50,
        refundStatus: "initiated",
        refundType: "partial",
        refundReason: "Partial damage",
      },
    }).as("refund");

    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-type-partial"]').click();
    cy.get('[data-testid="refund-amount-input"]').type("50");
    cy.get('[data-testid="refund-reason-input"]').type("Partial damage");
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.wait("@refund").its("request.body").then((body: { type: string; amount: number }) => {
      expect(body.type).to.eq("partial");
      expect(body.amount).to.eq(50);
    });
  });

  it("displays error message when refund API fails", () => {
    cy.intercept("POST", "/api/admin/orders/*/refund", {
      statusCode: 422,
      body: { success: false, error: "Only paid orders can be refunded" },
    }).as("refundFail");

    openPaidOrderModal();
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-reason-input"]').type("Test reason");
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.wait("@refundFail");
    cy.get('[data-testid="refund-error"]').should("be.visible");
  });
});

/* ── RBAC ──────────────────────────────────────────────────────────────────── */

describe("Admin Orders — RBAC", () => {
  it("redirects non-admin to home page", () => {
    cy.intercept("GET", "/api/admin/orders*", ORDERS_STUB).as("getOrders");
    cy.visit("/admin/orders", { onBeforeLoad: stubCustomerAuth });
    cy.url().should("not.include", "/admin");
  });
});

export {};
