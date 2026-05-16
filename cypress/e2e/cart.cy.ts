/// <reference types="cypress" />

/*
 * E2E — Cart (Tesco-style enterprise cart)
 * Covers: empty state, item rendering, quantity controls, remove,
 * save-for-later, move-to-cart, stock messaging, delivery badges,
 * order summary (items count, delivery), recommendations, mobile sticky CTA.
 * API calls are intercepted so tests run without a live database.
 */

// ── Shared mock data ────────────────────────────────────────────────────────

const mockProduct = {
  _id: "prod001",
  name: "Organic Full-Fat Milk 2L",
  slug: "organic-full-fat-milk-2l",
  price: 89,
  originalPrice: 120,
  images: ["/images/placeholder.webp"],
  brand: "Amul",
  unit: "2L",
  category: "dairy",
  inStock: true,
  rating: 4.5,
  reviewCount: 120,
  tags: [],
  badge: null,
  deliveryOptions: ["express", "standard"],
  vendorId: null,
  vendorName: null,
  description: "Fresh organic milk",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCartItem = { product: mockProduct, quantity: 2 };

function interceptCartAPIs() {
  cy.intercept("GET", "/api/account/cart", {
    statusCode: 200,
    body: { success: true, data: [mockCartItem] },
  }).as("getCart");

  cy.intercept("GET", "/api/account/cart/save-for-later", {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as("getSaved");

  cy.intercept("GET", "/api/account/cart/recommendations*", {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as("getRecommendations");

  cy.intercept("POST", "/api/offers/eligible", {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as("getOffers");
}

// Ensure the test customer account exists in the database before any cart test runs.
before(() => {
  cy.task("seedTestUser", {
    email:    Cypress.env("TEST_USER_EMAIL"),
    password: Cypress.env("TEST_USER_PASSWORD"),
    name:     "Test Customer",
  });
});

function loginTestUser() {
  cy.loginByApi(Cypress.env("TEST_USER_EMAIL"), Cypress.env("TEST_USER_PASSWORD"));
}

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Empty State", () => {
  /*
   * The cart page requires authentication. Without auth it shows an auth wall
   * ("Sign in to view your cart"). To test the actual empty-cart UI we log in
   * and mock the API to return an empty list.
   */
  beforeEach(() => {
    cy.intercept("GET", "/api/account/cart", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getEmptyCart");

    cy.intercept("GET", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getSaved");

    cy.intercept("GET", "/api/account/cart/recommendations*", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getRecommendations");

    cy.intercept("POST", "/api/offers/eligible", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getOffers");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getEmptyCart");
  });

  it("renders the cart page without crashing", () => {
    cy.get("main").should("be.visible");
  });

  it("shows an empty-cart message when there are no items", () => {
    cy.contains(/your trolley is empty|your cart is empty|no items/i).should("be.visible");
  });

  it("shows a link to continue shopping from the empty cart", () => {
    cy.contains(/browse products|shop|browse|continue/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — With Items (mocked API)", () => {
  /*
   * The Zustand cart store does NOT use persist middleware, so seeding
   * localStorage has no effect. Instead we log in and intercept the cart API
   * to return a known item. formatPrice formats as INR (e.g. ₹89).
   */
  beforeEach(() => {
    cy.intercept("GET", "/api/account/cart", {
      statusCode: 200,
      body: { success: true, data: [mockCartItem] },
    }).as("getCart");

    cy.intercept("GET", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getSaved");

    cy.intercept("GET", "/api/account/cart/recommendations*", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getRecommendations");

    cy.intercept("POST", "/api/offers/eligible", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getOffers");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("displays the product name from the cart", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });

  it("shows the correct item price", () => {
    cy.contains(/₹89|89/).should("exist");
  });

  it("renders a quantity control", () => {
    cy.get('[data-testid="qty-decrease"]').should("exist");
    cy.get('[data-testid="qty-increase"]').should("exist");
  });

  it("shows the order summary section", () => {
    cy.contains(/subtotal|total|order summary/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Add to Cart Interaction", () => {
  /*
   * The product detail page is a Next.js server component — it fetches from
   * MongoDB directly (not via a browser-side API call), so cy.intercept cannot
   * stub the initial data. We seed the product into the real DB via a task
   * before the test, and log in so the "Add to Cart" button is shown
   * (without auth the button reads "Sign in to Add" and redirects to /login).
   */
  before(() => {
    cy.task("seedTestProduct", {
      slug:         "sourdough-loaf-800g",
      name:         "Sourdough Loaf 800g",
      description:  "Artisan sourdough loaf.",
      price:        250,
      images:       ["/images/placeholder.webp"],
      category:     "Bakery",
      brand:        "Artisan Bakes",
      unit:         "800g",
      inStock:      true,
      rating:       4.8,
      reviewCount:  87,
    });
  });

  beforeEach(() => {
    cy.intercept("GET", "/api/reviews*", {
      statusCode: 200,
      body: { success: true, data: { reviews: [], total: 0 } },
    }).as("reviews");

    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1, limit: 4 } },
    }).as("related");

    loginTestUser();
    cy.visit("/products/sourdough-loaf-800g");
  });

  it("adds the product to the cart when Add to Cart is clicked", () => {
    cy.contains(/add to cart/i).click();
    /* Cart icon in the navbar should reflect the updated count */
    cy.get('[aria-label*="Cart"]').should("be.visible");
  });

  it("shows a toast confirmation after adding to cart", () => {
    cy.contains(/add to cart/i).click();
    /* Sonner toast should appear */
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Checkout Navigation", () => {
  /*
   * The checkout button ("Proceed to Checkout") is rendered inside OrderSummary
   * which only appears when the user is authenticated and has cart items.
   */
  beforeEach(() => {
    cy.intercept("GET", "/api/account/cart", {
      statusCode: 200,
      body: { success: true, data: [mockCartItem] },
    }).as("getCart");

    cy.intercept("GET", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getSaved");

    cy.intercept("GET", "/api/account/cart/recommendations*", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getRecommendations");

    cy.intercept("POST", "/api/offers/eligible", {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as("getOffers");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("has a checkout button visible when the cart has items", () => {
    cy.contains(/checkout|proceed/i).should("be.visible");
  });

  it("shows sign-in prompt when an unauthenticated user visits the cart", () => {
    /* Simulate logout then reload — the auth wall should appear */
    cy.clearLocalStorage("prakash-auth");
    cy.reload();
    cy.contains(/sign in to view your cart|sign in/i).should("be.visible");
    cy.get('a[href*="/login"]').should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Quantity Stepper", () => {
  beforeEach(() => {
    interceptCartAPIs();
    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("renders decrease and increase buttons", () => {
    cy.get('[data-testid="qty-decrease"]').should("exist");
    cy.get('[data-testid="qty-increase"]').should("exist");
  });

  it("shows current quantity value", () => {
    cy.get('[data-testid="qty-value"]').first().should("be.visible");
  });

  it("increase button is enabled for in-stock items", () => {
    cy.get('[data-testid="qty-increase"]').first().should("not.be.disabled");
  });

  it("decrease button is disabled when quantity is 1", () => {
    cy.intercept("GET", "/api/account/cart", {
      statusCode: 200,
      body: { success: true, data: [{ ...mockCartItem, quantity: 1 }] },
    });
    cy.reload();
    cy.get('[data-testid="qty-decrease"]').first().should("be.disabled");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Save for Later", () => {
  beforeEach(() => {
    interceptCartAPIs();
    cy.intercept("POST", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: {
        success: true,
        data: [{ product: mockProduct, savedAt: new Date().toISOString() }],
      },
    }).as("saveForLater");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("renders save-for-later button on cart items", () => {
    cy.get('[data-testid="save-for-later"]').should("exist");
  });

  it("calls save-for-later API when save button is clicked", () => {
    cy.get('[data-testid="save-for-later"]').first().click();
    cy.wait("@saveForLater").its("request.body").should("have.property", "productId");
  });

  it("shows a toast after saving for later", () => {
    cy.get('[data-testid="save-for-later"]').first().click();
    cy.get('[data-sonner-toast], [role="status"]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Saved Items Section", () => {
  beforeEach(() => {
    interceptCartAPIs();

    cy.intercept("GET", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: {
        success: true,
        data: [{ product: mockProduct, savedAt: new Date().toISOString() }],
      },
    }).as("getSaved");

    cy.intercept("POST", "/api/account/cart/move-to-cart", {
      statusCode: 200,
      body: { success: true, data: [mockCartItem] },
    }).as("moveToCart");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("shows the saved items section when items are saved", () => {
    cy.get('[data-testid="saved-items-section"]').should("exist");
  });

  it("displays saved item name", () => {
    cy.get('[data-testid="saved-item"]').first().contains(mockProduct.name);
  });

  it("move-to-cart button is present on saved items", () => {
    cy.get('[data-testid="move-to-cart"]').first().should("be.visible");
  });

  it("calls move-to-cart API when move button is clicked", () => {
    cy.get('[data-testid="move-to-cart"]').first().click();
    cy.wait("@moveToCart").its("request.body").should("have.property", "productId");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Order Summary", () => {
  beforeEach(() => {
    interceptCartAPIs();
    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("renders the order summary section", () => {
    cy.get('[data-testid="order-summary"]').should("exist");
  });

  it("shows subtotal in the summary", () => {
    cy.get('[data-testid="order-summary"]').contains(/subtotal/i).should("be.visible");
  });

  it("shows delivery row in the summary", () => {
    cy.get('[data-testid="order-summary"]').contains(/delivery/i).should("be.visible");
  });


  it("shows total amount", () => {
    cy.get('[data-testid="order-summary"]').contains(/total/i).should("be.visible");
  });

  it("shows items count in order summary", () => {
    cy.get('[data-testid="order-summary"]').contains(/item/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Delivery & Stock Messages", () => {
  it("shows express delivery badge for express products", () => {
    const expressProduct = { ...mockProduct, deliveryOptions: ["express"] };
    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: [{ product: expressProduct, quantity: 1 }] },
    });
    cy.intercept("GET", "/api/account/cart/save-for-later", { body: { success: true, data: [] } });
    cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

    loginTestUser();
    cy.visit("/cart");
    cy.contains(/express delivery/i).should("be.visible");
  });

  it("shows out-of-stock badge for unavailable products", () => {
    const oos = { ...mockProduct, inStock: false };
    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: [{ product: oos, quantity: 1 }] },
    });
    cy.intercept("GET", "/api/account/cart/save-for-later", { body: { success: true, data: [] } });
    cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

    loginTestUser();
    cy.visit("/cart");
    cy.contains(/out of stock/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Recommendations Section", () => {
  it("shows recommendations when API returns products", () => {
    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: [mockCartItem] },
    });
    cy.intercept("GET", "/api/account/cart/save-for-later", { body: { success: true, data: [] } });
    cy.intercept("GET", "/api/account/cart/recommendations*", {
      body: {
        success: true,
        data: [
          { _id: "rec001", name: "Greek Yogurt 500g", slug: "greek-yogurt", price: 45,
            images: [], brand: "Amul", unit: "500g", rating: 4.2, inStock: true,
            badge: null, vendorName: null },
        ],
      },
    }).as("getRec");
    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getRec");
    cy.get('[data-testid="cart-recommendations"]').should("be.visible");
    cy.contains("Greek Yogurt 500g").should("be.visible");
  });

  it("hides the recommendations section when API returns empty list", () => {
    interceptCartAPIs();
    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
    cy.get('[data-testid="cart-recommendations"]').should("not.exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Mobile Sticky Checkout", () => {
  beforeEach(() => {
    interceptCartAPIs();
    cy.viewport("iphone-x");
    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("shows mobile checkout button on small screens", () => {
    cy.get('[data-testid="mobile-checkout-btn"]').should("be.visible");
  });

  it("mobile checkout button links to /checkout", () => {
    cy.get('[data-testid="mobile-checkout-btn"]')
      .should("have.attr", "href")
      .and("include", "/checkout");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Saved Items Empty State", () => {
  beforeEach(() => {
    /* interceptCartAPIs already stubs getSaved with [] */
    interceptCartAPIs();
    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("always renders the saved-items section header even when no items are saved", () => {
    cy.get('[data-testid="saved-items-section"]').should("exist");
    cy.contains(/saved for later/i).should("be.visible");
  });

  it("shows the empty-state message when no items are saved", () => {
    cy.get('[data-testid="saved-items-empty"]').should("be.visible");
    cy.contains(/no saved products yet/i).should("be.visible");
  });

  it("shows a badge with count 0 in the header", () => {
    cy.get('[data-testid="saved-items-section"]').contains("0").should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Saved Items Toggle (Accordion)", () => {
  beforeEach(() => {
    interceptCartAPIs();
    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("collapses the saved section when the header is clicked", () => {
    cy.get('[data-testid="saved-items-empty"]').should("be.visible");
    cy.get('[data-testid="saved-items-toggle"]').click();
    cy.get('[data-testid="saved-items-empty"]').should("not.exist");
  });

  it("expands the saved section again on second click", () => {
    cy.get('[data-testid="saved-items-toggle"]').click();
    cy.get('[data-testid="saved-items-toggle"]').click();
    cy.get('[data-testid="saved-items-empty"]').should("be.visible");
  });

  it("toggle button has correct aria-expanded attribute", () => {
    cy.get('[data-testid="saved-items-toggle"]').should("have.attr", "aria-expanded", "true");
    cy.get('[data-testid="saved-items-toggle"]').click();
    cy.get('[data-testid="saved-items-toggle"]').should("have.attr", "aria-expanded", "false");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Remove Saved Item", () => {
  beforeEach(() => {
    interceptCartAPIs();

    cy.intercept("GET", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: {
        success: true,
        data: [{ product: mockProduct, savedAt: new Date().toISOString() }],
      },
    }).as("getSaved");

    cy.intercept("DELETE", "/api/account/cart/saved/*", {
      statusCode: 200,
      body: { success: true },
    }).as("removeSaved");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("renders a remove button on each saved item", () => {
    cy.get('[data-testid="remove-saved"]').should("exist");
  });

  it("calls the delete API when remove is clicked", () => {
    cy.get('[data-testid="remove-saved"]').first().click();
    cy.wait("@removeSaved");
  });

  it("shows a success toast after removing a saved item", () => {
    cy.get('[data-testid="remove-saved"]').first().click();
    cy.get('[data-sonner-toast], [role="status"]', { timeout: 6000 }).should("exist");
  });

  it("removes the item card from the list after removal", () => {
    cy.intercept("DELETE", "/api/account/cart/saved/*", {
      statusCode: 200,
      body: { success: true },
    });
    cy.get('[data-testid="saved-item"]').should("have.length", 1);
    cy.get('[data-testid="remove-saved"]').first().click();
    cy.get('[data-testid="saved-item"]').should("have.length", 0);
    cy.get('[data-testid="saved-items-empty"]').should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Out-of-Stock Saved Item", () => {
  it("disables the move-to-cart button when saved item is out of stock", () => {
    const oosProduct = { ...mockProduct, inStock: false };

    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: [mockCartItem] },
    });
    cy.intercept("GET", "/api/account/cart/save-for-later", {
      body: {
        success: true,
        data: [{ product: oosProduct, savedAt: new Date().toISOString() }],
      },
    });
    cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

    loginTestUser();
    cy.visit("/cart");

    cy.get('[data-testid="move-to-cart"]').first().should("be.disabled");
  });

  it("shows out-of-stock label on the saved item card", () => {
    const oosProduct = { ...mockProduct, inStock: false };

    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: [mockCartItem] },
    });
    cy.intercept("GET", "/api/account/cart/save-for-later", {
      body: {
        success: true,
        data: [{ product: oosProduct, savedAt: new Date().toISOString() }],
      },
    });
    cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

    loginTestUser();
    cy.visit("/cart");

    cy.get('[data-testid="saved-item"]').contains(/out of stock/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Saved Items Persistence After Refresh", () => {
  it("refetches and re-renders saved items after a page reload", () => {
    cy.intercept("GET", "/api/account/cart", {
      body: { success: true, data: [mockCartItem] },
    }).as("getCart");
    cy.intercept("GET", "/api/account/cart/save-for-later", {
      body: {
        success: true,
        data: [{ product: mockProduct, savedAt: new Date().toISOString() }],
      },
    }).as("getSaved");
    cy.intercept("GET", "/api/account/cart/recommendations*", { body: { success: true, data: [] } });
    cy.intercept("POST", "/api/offers/eligible", { body: { success: true, data: [] } });

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getSaved");
    cy.get('[data-testid="saved-item"]').should("have.length", 1);

    cy.reload();
    cy.wait("@getSaved");
    cy.get('[data-testid="saved-item"]').should("have.length", 1);
    cy.contains(mockProduct.name).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Mobile Saved Items Accordion", () => {
  beforeEach(() => {
    cy.viewport("iphone-x");
    interceptCartAPIs();
    cy.intercept("GET", "/api/account/cart/save-for-later", {
      statusCode: 200,
      body: {
        success: true,
        data: [{ product: mockProduct, savedAt: new Date().toISOString() }],
      },
    }).as("getSaved");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("shows saved section header on mobile", () => {
    cy.get('[data-testid="saved-items-section"]').should("be.visible");
    cy.contains(/saved for later/i).should("be.visible");
  });

  it("collapses and expands saved section on mobile", () => {
    cy.get('[data-testid="saved-item"]').should("be.visible");
    cy.get('[data-testid="saved-items-toggle"]').click();
    cy.get('[data-testid="saved-item"]').should("not.exist");
    cy.get('[data-testid="saved-items-toggle"]').click();
    cy.get('[data-testid="saved-item"]').should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Cart — Remove Item", () => {
  beforeEach(() => {
    interceptCartAPIs();
    cy.intercept("DELETE", "/api/account/cart/*", {
      statusCode: 200,
      body: { success: true },
    }).as("removeItem");

    loginTestUser();
    cy.visit("/cart");
    cy.wait("@getCart");
  });

  it("shows cart items", () => {
    cy.get('[data-testid="cart-item"]').should("have.length.gte", 1);
  });

  it("clear trolley button is visible", () => {
    cy.get('[data-testid="clear-cart"]').should("exist");
  });
});
