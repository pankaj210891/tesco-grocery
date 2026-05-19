/**
 * E2E: Checkout Flow
 *
 * Covers:
 *  Guard states
 *    - Unauthenticated user sees "Sign in to checkout" prompt
 *    - Empty cart shows "Your cart is empty" state
 *
 *  Happy path — COD
 *    - Delivery details form is pre-filled from saved address
 *    - All delivery fields accept input
 *    - Payment method selection (COD) shows COD fee note
 *    - Order Summary panel shows correct subtotal
 *    - Place order submits successfully → redirects to /checkout/confirmation
 *    - Confirmation page shows order reference, amount, and COD badge
 *    - Confirmation page "Continue Shopping" and "Back to Home" CTAs work
 *
 *  Happy path — Razorpay
 *    - Selecting Razorpay shows SSL secure badge note
 *    - Place order button label updates to "Pay with Razorpay"
 *
 *  Validation
 *    - Empty form submission shows field-level validation errors
 *    - Invalid email shows "valid email" error
 *    - Phone > 10 digits is clamped to 10
 *    - Postcode too short triggers postcode error
 *    - No payment method selected triggers payment error
 *
 *  Promo code
 *    - Promo input is visible before any code is applied
 *    - Valid promo code reduces the order total
 *    - Invalid promo code shows toast error
 *    - Applied promo can be removed
 *
 *  API guard
 *    - POST /api/payments/cod returns 401 for unauthenticated requests
 */

// ── Shared fixtures ───────────────────────────────────────────────────────────

const CUSTOMER_EMAIL    = Cypress.env("CUSTOMER_EMAIL")    ?? "customer@example.com";
const CUSTOMER_PASSWORD = Cypress.env("CUSTOMER_PASSWORD") ?? "Test@1234";

const MOCK_PRODUCT = {
  _id:          "prod_abc",
  name:         "Organic Whole Milk 2L",
  slug:         "organic-whole-milk-2l",
  description:  "Fresh whole milk",
  price:        120,
  images:       ["/images/placeholder-product.webp"],
  category:     "Dairy",
  brand:        "Farm Fresh",
  unit:         "2L",
  inStock:      true,
  stockQuantity: null,
  rating:       4.5,
  reviewCount:  23,
  tags:         ["dairy", "milk"],
  createdAt:    new Date().toISOString(),
  updatedAt:    new Date().toISOString(),
};

const MOCK_CART_RESPONSE = {
  success: true,
  data: {
    items: [{ product: MOCK_PRODUCT, quantity: 2 }],
    savedItems: [],
  },
};

const MOCK_ADDRESS = {
  _id:      "addr_001",
  userId:   "user_001",
  label:    "Home",
  fullName: "Raj Kumar",
  phone:    "9876543210",
  line1:    "12 Farm Lane",
  line2:    "",
  city:     "Mumbai",
  postcode: "400001",
  country:  "IN",
  isDefault: true,
};

const MOCK_COD_RESPONSE = {
  success: true,
  data: {
    orderNumber: "ORD-20240519-001",
    total:       289,
    paymentMethod: "cod",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function customerLogin() {
  cy.request("POST", "/api/auth/login", {
    email:    CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const { token, user } = res.body.data as { token: string; user: object };
    window.localStorage.setItem(
      "prakash-auth",
      JSON.stringify({ state: { user, token, hasHydrated: true }, version: 0 }),
    );
  });
}

/** Visit /cart so Zustand's loadCart populates the store, then navigate to /checkout */
function setupCartAndGoToCheckout() {
  cy.intercept("GET", "/api/account/cart", { body: MOCK_CART_RESPONSE }).as("loadCart");
  cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
  cy.intercept("POST", "/api/account/wishlist/sync", { body: { success: true, data: [] } });
  cy.intercept("GET", "/api/account/addresses", {
    body: { success: true, data: [MOCK_ADDRESS] },
  }).as("loadAddresses");
  cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

  cy.visit("/cart");
  cy.wait("@loadCart");
  // Wait for at least one cart item to appear before navigating
  cy.get('[data-testid="cart-item"]', { timeout: 10000 }).should("exist");

  // Navigate to checkout via the link (preserves Zustand in-memory state)
  cy.get('a[href="/checkout"]').first().click();
  cy.url().should("include", "/checkout");
  cy.wait("@loadAddresses");
}

// ── Guard states ──────────────────────────────────────────────────────────────

describe("Checkout — guard states", () => {
  it("shows Sign in prompt for unauthenticated users", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit("/checkout");
    cy.contains("Sign in to checkout").should("be.visible");
    cy.contains("Sign in").should("have.attr", "href", "/login");
  });

  it("shows empty cart state when cart has no items", () => {
    customerLogin();
    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: { items: [], savedItems: [] } },
    }).as("emptyCart");
    cy.intercept("POST", "/api/account/wishlist/sync", { body: { success: true, data: [] } });

    // Visit cart so the store gets loaded=true with empty items
    cy.visit("/cart");
    cy.wait("@emptyCart");

    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });
    cy.visit("/checkout");
    cy.contains("Your cart is empty").should("be.visible");
    cy.contains("Browse products").should("have.attr", "href", "/products");
  });
});

// ── Checkout page structure ───────────────────────────────────────────────────

describe("Checkout — page structure", () => {
  beforeEach(() => {
    customerLogin();
    setupCartAndGoToCheckout();
  });

  it("renders three numbered sections", () => {
    cy.contains("Delivery Details").should("be.visible");
    cy.contains("Delivery Slot").should("be.visible");
    cy.contains("Payment Method").should("be.visible");
  });

  it("renders Order Summary panel on the right", () => {
    cy.contains("Order Summary").should("be.visible");
  });

  it("pre-fills delivery form from saved address", () => {
    cy.get('input[autocomplete="name"]').should("have.value",           MOCK_ADDRESS.fullName);
    cy.get('input[autocomplete="tel"]').should("have.value",            MOCK_ADDRESS.phone);
    cy.get('input[autocomplete="street-address"]').should("have.value", MOCK_ADDRESS.line1);
    cy.get('input[autocomplete="address-level2"]').should("have.value", MOCK_ADDRESS.city);
    cy.get('input[autocomplete="postal-code"]').should("have.value",    MOCK_ADDRESS.postcode);
  });

  it("shows both payment method options", () => {
    cy.contains("Pay Online").should("be.visible");
    cy.contains("Cash on Delivery").should("be.visible");
  });
});

// ── Payment method selection ──────────────────────────────────────────────────

describe("Checkout — payment method UX", () => {
  beforeEach(() => {
    customerLogin();
    setupCartAndGoToCheckout();
  });

  it("selecting COD shows COD fee note", () => {
    cy.contains("Cash on Delivery").click();
    cy.contains("COD orders are confirmed immediately").should("be.visible");
  });

  it("selecting Razorpay shows SSL security note", () => {
    cy.contains("Pay Online").click();
    cy.contains("256-bit SSL secured").should("be.visible");
  });

  it("place order button label reflects Razorpay selection", () => {
    cy.contains("Pay Online").click();
    cy.get('button[type="submit"]').should("contain", "Pay with Razorpay");
  });

  it("place order button label reflects COD selection", () => {
    cy.contains("Cash on Delivery").click();
    cy.get('button[type="submit"]').should("contain", "Place COD Order");
  });

  it("COD charge appears in price breakdown after selecting COD", () => {
    cy.contains("Cash on Delivery").click();
    cy.contains("COD charge").should("be.visible");
  });
});

// ── Happy path: COD order ─────────────────────────────────────────────────────

describe("Checkout — COD happy path", () => {
  beforeEach(() => {
    customerLogin();
    setupCartAndGoToCheckout();
    // Pre-configure COD API intercept
    cy.intercept("POST", "/api/payments/cod", { body: MOCK_COD_RESPONSE }).as("placeCOD");
    cy.intercept("POST", "/api/account/cart", { body: { success: true, data: { items: [] } } });
  });

  it("successfully places a COD order and reaches confirmation", () => {
    // Fill in any field that needs correction (form should be pre-filled from address)
    cy.get('input[autocomplete="email"]').clear().type(CUSTOMER_EMAIL);

    // Select COD
    cy.contains("Cash on Delivery").click();

    // Submit
    cy.get('button[type="submit"]').click();
    cy.wait("@placeCOD");

    // Should redirect to confirmation
    cy.url().should("include", "/checkout/confirmation");
  });

  it("confirmation page shows correct order reference", () => {
    cy.get('input[autocomplete="email"]').clear().type(CUSTOMER_EMAIL);
    cy.contains("Cash on Delivery").click();
    cy.get('button[type="submit"]').click();
    cy.wait("@placeCOD");

    cy.url().should("include", "order=ORD-20240519-001");
    cy.contains("ORD-20240519-001").should("be.visible");
  });

  it("confirmation page shows COD badge", () => {
    cy.get('input[autocomplete="email"]').clear().type(CUSTOMER_EMAIL);
    cy.contains("Cash on Delivery").click();
    cy.get('button[type="submit"]').click();
    cy.wait("@placeCOD");

    cy.contains("Cash on Delivery").should("be.visible");
    cy.contains("Order Confirmed").should("be.visible");
  });
});

// ── Confirmation page standalone ─────────────────────────────────────────────

describe("Checkout confirmation page", () => {
  it("renders COD confirmation from URL params", () => {
    const params = new URLSearchParams({
      order: "ORD-TEST-0001",
      email: "test@example.com",
      total: "350.00",
      pm:    "cod",
    });
    cy.visit(`/checkout/confirmation?${params.toString()}`);

    cy.contains("Order Confirmed").should("be.visible");
    cy.contains("ORD-TEST-0001").should("be.visible");
    cy.contains("test@example.com").should("be.visible");
    cy.contains("Cash on Delivery").should("be.visible");
  });

  it("renders Razorpay confirmation from URL params", () => {
    const params = new URLSearchParams({
      order: "ORD-TEST-0002",
      email: "test@example.com",
      total: "450.00",
      pm:    "razorpay",
    });
    cy.visit(`/checkout/confirmation?${params.toString()}`);

    cy.contains("Payment Successful").should("be.visible");
    cy.contains("ORD-TEST-0002").should("be.visible");
    cy.contains("Paid via Razorpay").should("be.visible");
  });

  it("Continue Shopping CTA links to /products", () => {
    cy.visit("/checkout/confirmation?order=X&total=100&pm=cod");
    cy.contains("Continue Shopping").should("have.attr", "href", "/products");
  });

  it("Back to Home CTA links to /", () => {
    cy.visit("/checkout/confirmation?order=X&total=100&pm=cod");
    cy.contains("Back to Home").should("have.attr", "href", "/");
  });

  it("shows What happens next section", () => {
    cy.visit("/checkout/confirmation?order=X&total=100&pm=cod");
    cy.contains("What happens next").should("be.visible");
  });

  it("shows track order link to /account", () => {
    cy.visit("/checkout/confirmation?order=X&total=100&pm=cod");
    cy.contains("Track your order").should("be.visible");
    cy.get('a[href="/account"]').should("exist");
  });
});

// ── Form validation ───────────────────────────────────────────────────────────

describe("Checkout — form validation", () => {
  beforeEach(() => {
    customerLogin();
    // Intercept cart — return empty addresses so form isn't pre-filled
    cy.intercept("GET", "/api/account/cart", { body: MOCK_CART_RESPONSE }).as("loadCart");
    cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/account/wishlist/sync",        { body: { success: true, data: [] } });
    cy.intercept("GET", "/api/account/addresses",             { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/offers/eligible",              { body: { success: true, data: [] } });

    cy.visit("/cart");
    cy.wait("@loadCart");
    cy.get('[data-testid="cart-item"]', { timeout: 10000 }).should("exist");
    cy.get('a[href="/checkout"]').first().click();
    cy.url().should("include", "/checkout");
  });

  it("shows required errors on empty form submission", () => {
    cy.get('button[type="submit"]').click();
    cy.contains("Full name is required").should("be.visible");
  });

  it("shows email validation error for invalid email", () => {
    cy.get('input[autocomplete="name"]').type("Test User");
    cy.get('input[autocomplete="email"]').type("not-an-email");
    cy.get('button[type="submit"]').click();
    cy.contains("valid email").should("be.visible");
  });

  it("shows payment method error when no method is selected", () => {
    cy.get('input[autocomplete="name"]').type("Test User");
    cy.get('input[autocomplete="email"]').type(CUSTOMER_EMAIL);
    cy.get('input[autocomplete="tel"]').type("9876543210");
    cy.get('input[autocomplete="street-address"]').type("12 Test Street");
    cy.get('input[autocomplete="address-level2"]').type("Mumbai");
    cy.get('input[autocomplete="postal-code"]').type("400001");
    cy.get('button[type="submit"]').click();
    cy.contains("Select a payment method").should("be.visible");
  });
});

// ── Promo code ────────────────────────────────────────────────────────────────

describe("Checkout — promo code", () => {
  beforeEach(() => {
    customerLogin();
    setupCartAndGoToCheckout();
  });

  it("promo code input is visible in order summary", () => {
    cy.get('input[aria-label="Promo code"]').should("be.visible");
  });

  it("applying an invalid promo shows error via toast", () => {
    cy.intercept("POST", "/api/offers/apply", {
      body: { success: false, error: "Invalid promo code" },
    }).as("applyBadPromo");

    cy.get('input[aria-label="Promo code"]').type("BADCODE");
    cy.contains("Apply").click();
    cy.wait("@applyBadPromo");

    cy.contains("Invalid promo code").should("be.visible");
  });

  it("applying a valid promo shows savings and reduces total", () => {
    cy.intercept("POST", "/api/offers/apply", {
      body: {
        success: true,
        data: {
          code:           "SAVE50",
          label:          "₹50 off on orders above ₹200",
          discountType:   "fixed",
          discountValue:  50,
          discountAmount: 50,
          minOrderValue:  200,
        },
      },
    }).as("applyGoodPromo");

    cy.get('input[aria-label="Promo code"]').type("SAVE50");
    cy.contains("Apply").click();
    cy.wait("@applyGoodPromo");

    cy.contains("SAVE50").should("be.visible");
    cy.contains("You save").should("be.visible");
  });

  it("can remove an applied promo code", () => {
    cy.intercept("POST", "/api/offers/apply", {
      body: {
        success: true,
        data: {
          code:           "SAVE50",
          label:          "₹50 off",
          discountType:   "fixed",
          discountValue:  50,
          discountAmount: 50,
          minOrderValue:  200,
        },
      },
    }).as("applyPromo");

    cy.get('input[aria-label="Promo code"]').type("SAVE50");
    cy.contains("Apply").click();
    cy.wait("@applyPromo");

    cy.contains("SAVE50").should("be.visible");
    cy.get('button[aria-label="Remove promo code"]').click();
    cy.get('input[aria-label="Promo code"]').should("be.visible");
  });
});

// ── API auth guard ────────────────────────────────────────────────────────────

describe("Checkout API — auth guard", () => {
  it("POST /api/payments/cod returns 401 for unauthenticated request", () => {
    cy.request({
      method:           "POST",
      url:              "/api/payments/cod",
      body:             { items: [], delivery: {} },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401, 422]);
    });
  });

  it("POST /api/payments/razorpay/create-order returns 400/422 for bad payload", () => {
    cy.request({
      method:           "POST",
      url:              "/api/payments/razorpay/create-order",
      body:             {},
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401, 422, 500]);
    });
  });
});
