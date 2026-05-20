/**
 * E2E: Wishlist
 *
 * Covers:
 *  - Wishlist page: unauthenticated prompt
 *  - Wishlist page: empty state
 *  - Wishlist page: renders items loaded from API
 *  - Wishlist page: remove item via WishlistButton triggers DELETE
 *  - Wishlist page: "Add to cart" button triggers addItem
 *  - WishlistButton on product card: triggers POST when adding
 *  - WishlistButton on product card: triggers DELETE when removing
 *  - WishlistButton: guest click redirects to login
 *  - Navbar: wishlist count badge shown when items exist
 *  - Navbar: wishlist count badge hidden when wishlist empty
 *  - API auth guard: GET returns 401 when unauthenticated
 *  - API auth guard: POST returns 401 when unauthenticated
 *  - API auth guard: DELETE returns 401 when unauthenticated
 *  - API auth guard: PUT sync returns 401 when unauthenticated
 */

const CUSTOMER_EMAIL    = Cypress.env("CUSTOMER_EMAIL")    ?? "customer@example.com";
const CUSTOMER_PASSWORD = Cypress.env("CUSTOMER_PASSWORD") ?? "Test@1234";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PRODUCT = {
  _id:          "prod001",
  name:         "Organic Whole Milk",
  slug:         "organic-whole-milk",
  description:  "Fresh organic whole milk",
  price:        89,
  originalPrice: 99,
  images:       ["/images/placeholder-product.webp"],
  category:     "Dairy",
  brand:        "Amul",
  unit:         "1L",
  inStock:      true,
  rating:       4.5,
  reviewCount:  120,
  tags:         ["dairy", "organic"],
  createdAt:    new Date().toISOString(),
  updatedAt:    new Date().toISOString(),
};

const MOCK_PRODUCT_2 = {
  ...MOCK_PRODUCT,
  _id:   "prod002",
  name:  "Brown Eggs (6 pcs)",
  slug:  "brown-eggs-6",
  price: 65,
  category: "Eggs",
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

function interceptWishlist(items: object[] = [MOCK_PRODUCT]) {
  cy.intercept("GET", "/api/account/wishlist", {
    statusCode: 200,
    body: { data: items },
  }).as("getWishlist");
}

function interceptProducts() {
  cy.intercept("GET", "/api/products*", {
    body: {
      success: true,
      data: {
        products:   [MOCK_PRODUCT],
        total:      1,
        page:       1,
        totalPages: 1,
      },
    },
  }).as("getProducts");
}

// ── Suite 1: Unauthenticated wishlist page ────────────────────────────────────

describe("Wishlist page — unauthenticated", () => {
  beforeEach(() => {
    cy.visit("/account/wishlist");
  });

  it("shows the sign-in prompt", () => {
    cy.get('[data-testid="wishlist-signin-prompt"]').should("be.visible");
  });

  it("contains 'Sign in to view your wishlist' heading", () => {
    cy.contains("Sign in to view your wishlist").should("be.visible");
  });

  it("has a Sign in link pointing to /login", () => {
    cy.get('[data-testid="wishlist-signin-prompt"]')
      .contains("a", "Sign in")
      .should("have.attr", "href", "/login");
  });
});

// ── Suite 2: Wishlist page — empty state ─────────────────────────────────────

describe("Wishlist page — empty state", () => {
  beforeEach(() => {
    customerLogin();
    interceptWishlist([]);
    cy.visit("/account/wishlist");
    cy.wait("@getWishlist");
  });

  it("shows the empty-state block", () => {
    cy.get('[data-testid="wishlist-empty-state"]').should("be.visible");
  });

  it("contains 'Your wishlist is empty' message", () => {
    cy.contains("Your wishlist is empty").should("be.visible");
  });

  it("has a 'Browse products' link", () => {
    cy.get('[data-testid="wishlist-empty-state"]')
      .contains("a", "Browse products")
      .should("have.attr", "href", "/products");
  });
});

// ── Suite 3: Wishlist page — with items ───────────────────────────────────────

describe("Wishlist page — items loaded", () => {
  beforeEach(() => {
    customerLogin();
    interceptWishlist([MOCK_PRODUCT, MOCK_PRODUCT_2]);
    cy.visit("/account/wishlist");
    cy.wait("@getWishlist");
  });

  it("shows the Wishlist heading", () => {
    cy.contains("h1", "Wishlist").should("be.visible");
  });

  it("renders the correct number of wishlist items", () => {
    cy.get('[data-testid="wishlist-item"]').should("have.length", 2);
  });

  it("shows the item count in the heading", () => {
    cy.contains("(2 items)").should("be.visible");
  });

  it("displays product name and price for each item", () => {
    cy.contains(MOCK_PRODUCT.name).should("be.visible");
    cy.contains(MOCK_PRODUCT_2.name).should("be.visible");
    cy.contains(`₹${MOCK_PRODUCT.price}`).should("be.visible");
  });

  it("each item has an 'Add to cart' button", () => {
    cy.get('[data-testid="wishlist-add-to-cart"]').should("have.length", 2);
  });

  it("each item has a WishlistButton (remove button)", () => {
    cy.get('[data-testid="wishlist-item"]').first()
      .find('[data-testid="wishlist-btn"]')
      .should("exist");
  });
});

// ── Suite 4: Remove item from wishlist page ───────────────────────────────────

describe("Wishlist page — remove item", () => {
  beforeEach(() => {
    customerLogin();
    interceptWishlist([MOCK_PRODUCT]);
    cy.visit("/account/wishlist");
    cy.wait("@getWishlist");
  });

  it("calls DELETE when WishlistButton is clicked on wishlist page", () => {
    cy.intercept("DELETE", `/api/account/wishlist/${MOCK_PRODUCT._id}`, {
      statusCode: 200,
      body: { success: true },
    }).as("removeWishlist");

    cy.get('[data-testid="wishlist-item"]')
      .first()
      .find('[data-testid="wishlist-btn"]')
      .click();

    cy.wait("@removeWishlist");
  });

  it("item disappears from list after successful removal (optimistic UI)", () => {
    cy.intercept("DELETE", `/api/account/wishlist/${MOCK_PRODUCT._id}`, {
      statusCode: 200,
      body: { success: true },
    }).as("removeWishlist");

    cy.get('[data-testid="wishlist-item"]').should("have.length", 1);

    cy.get('[data-testid="wishlist-item"]')
      .first()
      .find('[data-testid="wishlist-btn"]')
      .click();

    cy.wait("@removeWishlist");
    cy.get('[data-testid="wishlist-item"]').should("have.length", 0);
    cy.get('[data-testid="wishlist-empty-state"]').should("be.visible");
  });
});

// ── Suite 5: Add to cart from wishlist page ───────────────────────────────────

describe("Wishlist page — Add to cart", () => {
  beforeEach(() => {
    customerLogin();
    interceptWishlist([MOCK_PRODUCT]);
    cy.intercept("POST", "/api/account/cart", {
      statusCode: 200,
      body: { success: true, data: { items: [] } },
    }).as("addToCart");
    cy.visit("/account/wishlist");
    cy.wait("@getWishlist");
  });

  it("'Add to cart' button is enabled for in-stock items", () => {
    cy.get('[data-testid="wishlist-add-to-cart"]').first().should("not.be.disabled");
  });

  it("clicking 'Add to cart' triggers a cart API call", () => {
    cy.get('[data-testid="wishlist-add-to-cart"]').first().click();
    cy.wait("@addToCart");
  });

  it("'Add to cart' button is disabled for out-of-stock items", () => {
    interceptWishlist([{ ...MOCK_PRODUCT, inStock: false }]);
    cy.visit("/account/wishlist");
    cy.wait("@getWishlist");
    cy.get('[data-testid="wishlist-add-to-cart"]').first().should("be.disabled");
  });
});

// ── Suite 6: WishlistButton on ProductCard ────────────────────────────────────

describe("WishlistButton on product listing — add flow", () => {
  beforeEach(() => {
    customerLogin();
    // Wishlist is empty initially
    interceptWishlist([]);
    interceptProducts();
    cy.visit("/products");
    cy.wait("@getProducts");
  });

  it("shows an unsaved heart button on product cards", () => {
    cy.get('[data-testid="wishlist-btn"]').first().should("exist");
    cy.get('[data-testid="wishlist-btn"]').first().should("have.attr", "data-saved", "false");
  });

  it("clicking the heart triggers POST to /api/account/wishlist", () => {
    cy.intercept("POST", "/api/account/wishlist", {
      statusCode: 200,
      body: { success: true },
    }).as("addWishlist");

    cy.get('[data-testid="wishlist-btn"]').first().click();
    cy.wait("@addWishlist");
  });

  it("button toggles to saved state after adding (optimistic UI)", () => {
    cy.intercept("POST", "/api/account/wishlist", {
      statusCode: 200,
      body: { success: true },
    }).as("addWishlist");

    cy.get('[data-testid="wishlist-btn"]').first().click();
    cy.wait("@addWishlist");

    cy.get('[data-testid="wishlist-btn"]').first().should("have.attr", "data-saved", "true");
  });
});

// ── Suite 7: WishlistButton — remove from product card ───────────────────────

describe("WishlistButton on product listing — remove flow", () => {
  beforeEach(() => {
    customerLogin();
    // Wishlist pre-seeded with the product
    interceptWishlist([MOCK_PRODUCT]);
    interceptProducts();
    cy.visit("/products");
    cy.wait("@getProducts");
  });

  it("shows a saved (filled) heart when product is in wishlist", () => {
    cy.get('[data-testid="wishlist-btn"]').first().should("have.attr", "data-saved", "true");
  });

  it("clicking a saved heart triggers DELETE", () => {
    cy.intercept("DELETE", `/api/account/wishlist/${MOCK_PRODUCT._id}`, {
      statusCode: 200,
      body: { success: true },
    }).as("removeWishlist");

    cy.get('[data-testid="wishlist-btn"]').first().click();
    cy.wait("@removeWishlist");
  });

  it("button reverts to unsaved state after deletion (optimistic UI)", () => {
    cy.intercept("DELETE", `/api/account/wishlist/${MOCK_PRODUCT._id}`, {
      statusCode: 200,
      body: { success: true },
    }).as("removeWishlist");

    cy.get('[data-testid="wishlist-btn"]').first().click();
    cy.wait("@removeWishlist");

    cy.get('[data-testid="wishlist-btn"]').first().should("have.attr", "data-saved", "false");
  });
});

// ── Suite 8: WishlistButton — guest redirect ──────────────────────────────────

describe("WishlistButton — guest (unauthenticated)", () => {
  beforeEach(() => {
    interceptProducts();
    cy.visit("/products");
    cy.wait("@getProducts");
  });

  it("clicking heart when not logged in redirects to /login", () => {
    cy.get('[data-testid="wishlist-btn"]').first().click();
    cy.url().should("include", "/login");
  });
});

// ── Suite 9: Navbar wishlist count badge ──────────────────────────────────────

describe("Navbar — wishlist count badge", () => {
  it("shows the count badge when wishlist has items", () => {
    customerLogin();
    interceptWishlist([MOCK_PRODUCT, MOCK_PRODUCT_2]);
    cy.visit("/");
    cy.wait("@getWishlist");

    cy.get('[data-testid="wishlist-count-badge"]').should("be.visible");
    cy.get('[data-testid="wishlist-count-badge"]').should("contain", "2");
  });

  it("does not show count badge when wishlist is empty", () => {
    customerLogin();
    interceptWishlist([]);
    cy.visit("/");
    cy.wait("@getWishlist");

    cy.get('[data-testid="wishlist-count-badge"]').should("not.exist");
  });

  it("shows 99+ when wishlist count exceeds 99", () => {
    const manyProducts = Array.from({ length: 100 }, (_, i) => ({
      ...MOCK_PRODUCT,
      _id:  `prod${i}`,
      slug: `product-${i}`,
      name: `Product ${i}`,
    }));

    customerLogin();
    interceptWishlist(manyProducts);
    cy.visit("/");
    cy.wait("@getWishlist");

    cy.get('[data-testid="wishlist-count-badge"]').should("contain", "99+");
  });

  it("wishlist nav link href points to /account/wishlist", () => {
    cy.visit("/");
    cy.get('[data-testid="nav-wishlist-link"]').should("have.attr", "href", "/account/wishlist");
  });
});

// ── Suite 10: API auth guards ─────────────────────────────────────────────────

describe("Wishlist API — auth guards", () => {
  it("GET /api/account/wishlist returns 401 when unauthenticated", () => {
    cy.request({
      method:           "GET",
      url:              "/api/account/wishlist",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("POST /api/account/wishlist returns 401 when unauthenticated", () => {
    cy.request({
      method:           "POST",
      url:              "/api/account/wishlist",
      body:             { productId: "prod001" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("DELETE /api/account/wishlist/:id returns 401 when unauthenticated", () => {
    cy.request({
      method:           "DELETE",
      url:              "/api/account/wishlist/prod001",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("PUT /api/account/wishlist/sync returns 401 when unauthenticated", () => {
    cy.request({
      method:           "PUT",
      url:              "/api/account/wishlist/sync",
      body:             { productIds: [] },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});
