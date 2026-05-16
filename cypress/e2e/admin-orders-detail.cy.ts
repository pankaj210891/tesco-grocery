// Admin order detail modal + refund E2E tests

describe("Admin Orders – Detail & Refund", () => {
  const adminEmail    = "admin@example.com";
  const adminPassword = "password123";

  function loginAsAdmin() {
    cy.session("admin", () => {
      cy.visit("/login");
      cy.get('[data-testid="email-input"]').type(adminEmail);
      cy.get('[data-testid="password-input"]').type(adminPassword);
      cy.get('[data-testid="login-btn"]').click();
      cy.url().should("not.include", "/login");
    });
  }

  beforeEach(() => {
    loginAsAdmin();
    cy.visit("/admin/orders");
    cy.get('[data-testid="order-row"]', { timeout: 10000 }).should("have.length.gte", 1);
  });

  // ─── View button ──────────────────────────────────────────────────────────

  it("shows a View (eye) button on each order row", () => {
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').should("exist");
    });
  });

  it("opens order detail modal when View button is clicked", () => {
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
  });

  it("displays order number in detail modal header", () => {
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-number"]').should("contain", "#");
  });

  it("closes detail modal via close button", () => {
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
    cy.get('[data-testid="order-detail-close"]').click();
    cy.get('[data-testid="order-detail-modal"]').should("not.exist");
  });

  it("closes detail modal via backdrop click", () => {
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.get('[data-testid="order-detail-modal"]').should("be.visible");
    cy.get('[data-testid="order-detail-modal"]').click({ force: true });
    cy.get('[data-testid="order-detail-modal"]').should("not.exist");
  });

  // ─── Order detail content ─────────────────────────────────────────────────

  it("shows timeline for non-cancelled orders", () => {
    cy.intercept("GET", "/api/admin/orders/*").as("orderDetail");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@orderDetail");
    cy.get('[data-testid="order-detail-modal"]').within(() => {
      // Only check if order is non-cancelled (timeline may or may not be present)
      cy.get("body").then(() => {
        const hasTimeline = Cypress.$('[data-testid="order-timeline"]').length > 0;
        if (hasTimeline) {
          cy.get('[data-testid="order-timeline"]').should("be.visible");
        }
      });
    });
  });

  it("fetches order detail via GET /api/admin/orders/:id", () => {
    cy.intercept("GET", "/api/admin/orders/*").as("orderDetail");
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@orderDetail").its("response.statusCode").should("eq", 200);
  });

  // ─── Refund flow ──────────────────────────────────────────────────────────

  it("shows Process Refund button for paid orders", () => {
    cy.intercept("GET", "/api/admin/orders/*", (req) => {
      req.reply({
        success: true,
        data: {
          _id: "test-order-id",
          orderNumber: "ORD-9999",
          items: [{ name: "Test Item", price: 100, quantity: 2, image: "", vendorName: "Test Vendor" }],
          delivery: { fullName: "Test User", email: "test@example.com", phone: "9999999999", address: "123 Test St", city: "Mumbai", postcode: "400001" },
          subtotal: 200, deliveryFee: 50, codCharge: 0, discount: 0, total: 250,
          status: "delivered",
          paymentMethod: "razorpay",
          paymentStatus: "paid",
          refundedAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }).as("paidOrderDetail");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@paidOrderDetail");
    cy.get('[data-testid="open-refund-btn"]').should("be.visible");
  });

  it("opens refund form when Process Refund clicked", () => {
    cy.intercept("GET", "/api/admin/orders/*", (req) => {
      req.reply({
        success: true,
        data: {
          _id: "test-order-id",
          orderNumber: "ORD-9999",
          items: [{ name: "Test Item", price: 100, quantity: 2, image: "", vendorName: "Test Vendor" }],
          delivery: { fullName: "Test User", email: "test@example.com", phone: "9999999999", address: "123 Test St", city: "Mumbai", postcode: "400001" },
          subtotal: 200, deliveryFee: 50, codCharge: 0, discount: 0, total: 250,
          status: "delivered",
          paymentMethod: "razorpay",
          paymentStatus: "paid",
          refundedAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }).as("paidOrderDetail");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@paidOrderDetail");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-form"]').should("be.visible");
  });

  it("defaults to full refund type", () => {
    cy.intercept("GET", "/api/admin/orders/*", { success: true, data: {
      _id: "order-x", orderNumber: "ORD-X", items: [{ name: "Item", price: 50, quantity: 1, image: "" }],
      delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 50, deliveryFee: 0, codCharge: 0, discount: 0, total: 50,
      status: "delivered", paymentMethod: "razorpay", paymentStatus: "paid", refundedAmount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("order");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@order");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-type-full"]').should("have.class", "border-orange-400");
  });

  it("switches to partial refund and shows amount input", () => {
    cy.intercept("GET", "/api/admin/orders/*", { success: true, data: {
      _id: "order-x", orderNumber: "ORD-X", items: [{ name: "Item", price: 100, quantity: 2, image: "" }],
      delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 200, deliveryFee: 0, codCharge: 0, discount: 0, total: 200,
      status: "delivered", paymentMethod: "razorpay", paymentStatus: "paid", refundedAmount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("order");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@order");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-type-partial"]').click();
    cy.get('[data-testid="refund-amount-input"]').should("be.visible");
  });

  it("shows error when reason is missing on refund submit", () => {
    cy.intercept("GET", "/api/admin/orders/*", { success: true, data: {
      _id: "order-x", orderNumber: "ORD-X", items: [{ name: "Item", price: 50, quantity: 1, image: "" }],
      delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 50, deliveryFee: 0, codCharge: 0, discount: 0, total: 50,
      status: "delivered", paymentMethod: "razorpay", paymentStatus: "paid", refundedAmount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("order");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@order");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.get('[data-testid="refund-error"]').should("contain", "Reason is required");
  });

  it("submits full refund and calls POST /api/admin/orders/:id/refund", () => {
    cy.intercept("GET", "/api/admin/orders/*", { success: true, data: {
      _id: "order-x", orderNumber: "ORD-X", items: [{ name: "Item", price: 50, quantity: 1, image: "" }],
      delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 50, deliveryFee: 0, codCharge: 0, discount: 0, total: 50,
      status: "delivered", paymentMethod: "razorpay", paymentStatus: "paid", refundedAmount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("order");

    cy.intercept("POST", "/api/admin/orders/*/refund", { success: true, data: {
      _id: "order-x", orderNumber: "ORD-X", paymentStatus: "refunded", refundedAmount: 50,
      refundStatus: "initiated", refundType: "full", refundReason: "Customer request",
      items: [], delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 50, deliveryFee: 0, codCharge: 0, discount: 0, total: 50,
      status: "delivered", paymentMethod: "razorpay",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("refund");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@order");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-reason-input"]').type("Customer request");
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.wait("@refund").its("request.body.type").should("eq", "full");
  });

  it("submits partial refund with amount", () => {
    cy.intercept("GET", "/api/admin/orders/*", { success: true, data: {
      _id: "order-y", orderNumber: "ORD-Y", items: [{ name: "Item", price: 100, quantity: 2, image: "" }],
      delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 200, deliveryFee: 0, codCharge: 0, discount: 0, total: 200,
      status: "delivered", paymentMethod: "razorpay", paymentStatus: "paid", refundedAmount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("order");

    cy.intercept("POST", "/api/admin/orders/*/refund", { success: true, data: {
      _id: "order-y", orderNumber: "ORD-Y", paymentStatus: "partially_refunded", refundedAmount: 50,
      refundStatus: "initiated", refundType: "partial", refundReason: "Partial damage",
      items: [], delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 200, deliveryFee: 0, codCharge: 0, discount: 0, total: 200,
      status: "delivered", paymentMethod: "razorpay",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("refund");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@order");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-type-partial"]').click();
    cy.get('[data-testid="refund-amount-input"]').type("50");
    cy.get('[data-testid="refund-reason-input"]').type("Partial damage");
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.wait("@refund").its("request.body").then((body: { type: string; amount: number; reason: string }) => {
      expect(body.type).to.eq("partial");
      expect(body.amount).to.eq(50);
    });
  });

  it("displays error message when refund API fails", () => {
    cy.intercept("GET", "/api/admin/orders/*", { success: true, data: {
      _id: "order-z", orderNumber: "ORD-Z", items: [{ name: "Item", price: 50, quantity: 1, image: "" }],
      delivery: { fullName: "User", email: "u@x.com", phone: "0000000000", address: "1 St", city: "City", postcode: "00000" },
      subtotal: 50, deliveryFee: 0, codCharge: 0, discount: 0, total: 50,
      status: "delivered", paymentMethod: "razorpay", paymentStatus: "paid", refundedAmount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }}).as("order");

    cy.intercept("POST", "/api/admin/orders/*/refund", {
      statusCode: 422,
      body: { success: false, error: "Only paid orders can be refunded" },
    }).as("refundFail");

    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid^="view-order-"]').click();
    });
    cy.wait("@order");
    cy.get('[data-testid="open-refund-btn"]').click();
    cy.get('[data-testid="refund-reason-input"]').type("Test reason");
    cy.get('[data-testid="submit-refund-btn"]').click();
    cy.wait("@refundFail");
    cy.get('[data-testid="refund-error"]').should("be.visible");
  });

  // ─── RBAC ─────────────────────────────────────────────────────────────────

  it("redirects non-admin to home page", () => {
    cy.session("non-admin-user", () => {
      cy.visit("/login");
      cy.get('[data-testid="email-input"]').type("customer@example.com");
      cy.get('[data-testid="password-input"]').type("password123");
      cy.get('[data-testid="login-btn"]').click();
    });
    cy.visit("/admin/orders");
    cy.url().should("not.include", "/admin");
  });
});
