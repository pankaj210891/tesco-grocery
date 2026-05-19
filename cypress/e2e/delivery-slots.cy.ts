/// <reference types="cypress" />

/*
 * E2E — Delivery Slot Booking
 * Tests the slot selector in the checkout flow and admin slot management.
 * All API calls are intercepted so tests run without a live database.
 */

// ── Shared helpers ───────────────────────────────────────────────────────────

const TODAY = new Date();
function isoDate(daysAhead = 0) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

const mockAvailableDates = [
  { date: isoDate(1), hasAvailability: true,  totalAvailable: 60 },
  { date: isoDate(2), hasAvailability: true,  totalAvailable: 40 },
  { date: isoDate(3), hasAvailability: false, totalAvailable: 0  },
];

const mockSlots = [
  { _id: "slot001", date: isoDate(1), window: "09:00-12:00", capacity: 20, bookedCount: 5,  isActive: true, cutoffTime: new Date(Date.now() + 86400000).toISOString() },
  { _id: "slot002", date: isoDate(1), window: "12:00-16:00", capacity: 20, bookedCount: 20, isActive: true, cutoffTime: new Date(Date.now() + 86400000).toISOString() },
  { _id: "slot003", date: isoDate(1), window: "16:00-20:00", capacity: 20, bookedCount: 8,  isActive: true, cutoffTime: new Date(Date.now() + 86400000).toISOString() },
  { _id: "slot004", date: isoDate(1), window: "20:00-22:00", capacity: 20, bookedCount: 0,  isActive: true, cutoffTime: new Date(Date.now() + 86400000).toISOString() },
];

const mockCartItem = {
  product: {
    _id:          "prod001",
    name:         "Organic Full-Fat Milk 2L",
    slug:         "organic-full-fat-milk-2l",
    price:        89,
    originalPrice: 120,
    images:       ["/images/placeholder.webp"],
    brand:        "Amul",
    unit:         "2L",
    category:     "dairy",
    inStock:      true,
    rating:       4.5,
    reviewCount:  0,
    tags:         [],
    badge:        null,
    deliveryOptions: ["standard"],
    vendorId:     null,
    vendorName:   null,
  },
  quantity: 2,
};

function loginTestUser() {
  cy.loginByApi(Cypress.env("TEST_USER_EMAIL"), Cypress.env("TEST_USER_PASSWORD"));
}

function interceptCartWithItems() {
  cy.intercept("GET", "/api/account/cart", {
    statusCode: 200,
    body: { success: true, data: [mockCartItem] },
  }).as("getCart");
}

function interceptDeliverySlotAPIs() {
  cy.intercept("GET", "/api/delivery-slots/available-dates", {
    statusCode: 200,
    body: { success: true, data: mockAvailableDates },
  }).as("getAvailableDates");

  cy.intercept("GET", `/api/delivery-slots*`, {
    statusCode: 200,
    body: { success: true, data: mockSlots },
  }).as("getSlots");
}

function interceptCheckoutAPIs() {
  cy.intercept("GET", "/api/account/cart/save-for-later", { body: { success: true, data: [] } });
  cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
  cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });
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

describe("Delivery Slots — Checkout Selector Rendering", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();
    loginTestUser();
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
  });

  it("renders the delivery slot selector section", () => {
    cy.get('[data-testid="delivery-slot-selector"]').should("be.visible");
  });

  it("shows available dates as selectable options", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).should("be.visible");
    cy.get(`[data-testid="slot-date-${isoDate(2)}"]`).should("be.visible");
  });

  it("marks fully-booked dates as disabled or styled differently", () => {
    cy.get(`[data-testid="slot-date-${isoDate(3)}"]`).should(($el) => {
      const isDisabled = $el.is(":disabled") || $el.hasClass("opacity") || $el.hasClass("cursor-not-allowed");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isDisabled || $el.attr("disabled") !== undefined).to.be.true;
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Selecting a Date", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();
    loginTestUser();
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
  });

  it("loads time windows when a date is selected", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
    cy.get('[data-testid="slot-window-09:00-12:00"]').should("be.visible");
  });

  it("shows all four slot windows for the selected date", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
    cy.get('[data-testid="slot-window-09:00-12:00"]').should("exist");
    cy.get('[data-testid="slot-window-12:00-16:00"]').should("exist");
    cy.get('[data-testid="slot-window-16:00-20:00"]').should("exist");
    cy.get('[data-testid="slot-window-20:00-22:00"]').should("exist");
  });

  it("marks fully-booked windows as disabled", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
    // slot002 has bookedCount === capacity (20/20), should be disabled
    cy.get('[data-testid="slot-window-12:00-16:00"]').should("be.disabled");
  });

  it("allows selecting an available window", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
    cy.get('[data-testid="slot-window-09:00-12:00"]').click();
    // Should not throw; selector reflects the choice
    cy.get('[data-testid="slot-window-09:00-12:00"]').should("not.be.disabled");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Slot Availability Indicators", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();
    loginTestUser();
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
  });

  it("shows the number of slots left for available windows", () => {
    cy.contains(/\d+ (slot|space)s? left|\d+ available/i).should("be.visible");
  });

  it("shows 'Full' or equivalent label on fully-booked windows", () => {
    cy.contains(/full|sold out|no slots|0 left/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — COD Checkout with Slot", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();

    cy.intercept("POST", "/api/payments/cod", {
      statusCode: 201,
      body: {
        success: true,
        data: { orderId: "order001", orderNumber: "ORD-20240001", total: 178 },
      },
    }).as("codCheckout");

    loginTestUser();
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
  });

  it("includes deliverySlot in the COD order payload", () => {
    // Select a delivery slot
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
    cy.get('[data-testid="slot-window-09:00-12:00"]').click();

    // Fill in address if form fields are visible
    cy.get('input[name="fullName"], #fullName', { timeout: 5000 }).then(($el) => {
      if ($el.length) {
        cy.wrap($el).clear().type("Test Customer");
        cy.get('input[name="email"], #email').clear().type("test@example.com");
        cy.get('input[name="phone"], #phone').clear().type("9999999999");
        cy.get('input[name="address"], #address').clear().type("123 Test Street");
        cy.get('input[name="city"], #city').clear().type("Mumbai");
        cy.get('input[name="postcode"], #postcode').clear().type("400001");
      }
    });

    // Place COD order
    cy.contains(/cash on delivery|cod|place order/i).click();
    cy.wait("@codCheckout").then((interception) => {
      const body = interception.request.body;
      expect(body).to.have.property("deliverySlot");
      expect(body.deliverySlot).to.include({ window: "09:00-12:00" });
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Slot Fully Booked During Checkout", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();

    cy.intercept("POST", "/api/payments/cod", {
      statusCode: 409,
      body: { success: false, error: "Selected delivery slot is no longer available. Please choose another." },
    }).as("slotConflict");

    loginTestUser();
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
  });

  it("shows a conflict error when the slot fills up during checkout", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).click();
    cy.wait("@getSlots");
    cy.get('[data-testid="slot-window-09:00-12:00"]').click();
    cy.contains(/cash on delivery|cod|place order/i).click();
    cy.wait("@slotConflict");
    cy.contains(/slot|no longer available|choose another/i, { timeout: 6000 }).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Checkout Without Slot (Optional)", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();

    cy.intercept("POST", "/api/payments/cod", {
      statusCode: 201,
      body: {
        success: true,
        data: { orderId: "order002", orderNumber: "ORD-20240002", total: 178 },
      },
    }).as("codNoSlot");

    loginTestUser();
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
  });

  it("allows checkout without selecting a delivery slot", () => {
    // Skip slot selection — submit without one
    cy.contains(/cash on delivery|cod|place order/i).click();
    cy.wait("@codNoSlot").then((interception) => {
      const body = interception.request.body;
      // deliverySlot should be absent or null
      const hasSlot = body.deliverySlot && body.deliverySlot.slotId;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(hasSlot).to.be.falsy;
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Mobile Responsiveness", () => {
  beforeEach(() => {
    interceptCartWithItems();
    interceptCheckoutAPIs();
    interceptDeliverySlotAPIs();
    loginTestUser();
    cy.viewport("iphone-x");
    cy.visit("/checkout");
    cy.wait("@getAvailableDates");
  });

  it("shows the delivery slot selector on mobile", () => {
    cy.get('[data-testid="delivery-slot-selector"]').should("be.visible");
  });

  it("date buttons are tappable on mobile", () => {
    cy.get(`[data-testid="slot-date-${isoDate(1)}"]`).should("be.visible").click();
    cy.wait("@getSlots");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Admin Management", () => {
  function loginAdmin() {
    cy.loginByApi(Cypress.env("TEST_ADMIN_EMAIL") ?? "admin@example.com", Cypress.env("TEST_ADMIN_PASSWORD") ?? "AdminPass1");
  }

  const adminSlots = [
    { _id: "slot001", date: isoDate(1), window: "09:00-12:00", capacity: 20, bookedCount: 5,  isActive: true,  cutoffTime: new Date(Date.now() + 86400000).toISOString() },
    { _id: "slot002", date: isoDate(1), window: "12:00-16:00", capacity: 20, bookedCount: 0,  isActive: false, cutoffTime: new Date(Date.now() + 86400000).toISOString() },
  ];

  beforeEach(() => {
    cy.intercept("GET", "/api/admin/delivery-slots*", {
      statusCode: 200,
      body: { success: true, data: adminSlots },
    }).as("getAdminSlots");

    loginAdmin();
    cy.visit("/admin/delivery-slots");
    cy.wait("@getAdminSlots");
  });

  it("renders the admin delivery slots page", () => {
    cy.contains(/delivery slots/i).should("be.visible");
  });

  it("shows slot window rows in the table", () => {
    cy.contains("09:00-12:00").should("be.visible");
  });

  it("shows booked/capacity for each slot", () => {
    cy.contains("5 / 20").should("be.visible");
  });

  it("shows Active and Inactive status badges", () => {
    cy.contains("Active").should("be.visible");
    cy.contains("Inactive").should("be.visible");
  });

  it("disable delete button for slots with bookings", () => {
    cy.get("button[title*='Cannot delete' i], button[disabled]").first().should("exist");
  });

  it("toggle button can activate an inactive slot", () => {
    cy.intercept("PATCH", "/api/admin/delivery-slots/slot002", {
      statusCode: 200,
      body: { success: true },
    }).as("toggleSlot");

    cy.get("button[title='Activate']").first().click();
    cy.wait("@toggleSlot");
    cy.get('[data-sonner-toast], [role="status"]', { timeout: 6000 }).should("exist");
  });

  it("Seed 14 Days button triggers seed API", () => {
    cy.intercept("POST", "/api/admin/delivery-slots/seed", {
      statusCode: 200,
      body: { message: "Seeded 56 slots across 14 days" },
    }).as("seedSlots");

    cy.contains(/seed 14 days/i).click();
    cy.wait("@seedSlots");
    cy.get('[data-sonner-toast], [role="status"]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Delivery Slots — Order Detail Shows Booked Slot", () => {
  const orderWithSlot = {
    _id:               "order001",
    orderNumber:       "ORD-20240001",
    status:            "processing",
    paymentMethod:     "cod",
    paymentStatus:     "pending",
    subtotal:          178,
    deliveryFee:       49,
    codCharge:         29,
    discount:          0,
    total:             256,
    createdAt:         new Date().toISOString(),
    items:             [{ productId: "prod001", name: "Organic Full-Fat Milk 2L", slug: "organic-full-fat-milk-2l", price: 89, quantity: 2, image: "/images/placeholder.webp" }],
    delivery:          { fullName: "Test Customer", email: "test@example.com", phone: "9999999999", address: "123 Test Street", city: "Mumbai", postcode: "400001" },
    deliverySlotDate:  isoDate(1),
    deliverySlotWindow: "09:00-12:00",
  };

  beforeEach(() => {
    cy.intercept("GET", `/api/account/orders/${orderWithSlot.orderNumber}`, {
      statusCode: 200,
      body: { success: true, data: orderWithSlot },
    }).as("getOrder");

    cy.loginByApi(Cypress.env("TEST_USER_EMAIL"), Cypress.env("TEST_USER_PASSWORD"));
    cy.visit(`/account/orders/${orderWithSlot.orderNumber}`);
    cy.wait("@getOrder");
  });

  it("displays the booked delivery slot date on the order detail page", () => {
    cy.contains(isoDate(1)).should("be.visible");
  });

  it("displays the booked delivery window on the order detail page", () => {
    cy.contains("09:00-12:00").should("be.visible");
  });
});
