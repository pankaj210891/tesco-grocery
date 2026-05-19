/// <reference types="cypress" />

/*
 * E2E — Verified Purchase Reviews
 * Tests the purchase-gated review system:
 *   - Guests see no review form
 *   - Logged-in users who haven't purchased see a "purchase required" gate
 *   - Logged-in users who have purchased see the review form
 *   - Verified Purchase badge displays correctly on verified reviews
 * All API calls are intercepted so tests run without a live database.
 */

const PRODUCT_SLUG = "organic-full-fat-milk-2l";

const mockProduct = {
  _id:          "prod001",
  name:         "Organic Full-Fat Milk 2L",
  slug:         PRODUCT_SLUG,
  price:        89,
  originalPrice: 120,
  images:       ["/images/placeholder.webp"],
  brand:        "Amul",
  unit:         "2L",
  category:     "dairy",
  inStock:      true,
  rating:       4.5,
  reviewCount:  3,
  tags:         [],
  badge:        null,
  deliveryOptions: ["standard"],
  vendorId:     null,
  vendorName:   null,
  description:  "Fresh organic milk",
  createdAt:    new Date().toISOString(),
  updatedAt:    new Date().toISOString(),
};

const verifiedReview = {
  _id:               "rev001",
  userId:            "user001",
  userName:          "Alice Smith",
  rating:            5,
  title:             "Best milk ever",
  comment:           "Super fresh and creamy.",
  isVerifiedPurchase: true,
  createdAt:         new Date().toISOString(),
};

const unverifiedReview = {
  _id:               "rev002",
  userId:            "user002",
  userName:          "Bob Jones",
  rating:            3,
  title:             "Average",
  comment:           "Decent product.",
  isVerifiedPurchase: false,
  createdAt:         new Date().toISOString(),
};

function loginTestUser() {
  cy.loginByApi(Cypress.env("TEST_USER_EMAIL"), Cypress.env("TEST_USER_PASSWORD"));
}

function interceptReviewsApi(reviews = [verifiedReview, unverifiedReview]) {
  cy.intercept("GET", `/api/products/${PRODUCT_SLUG}/reviews*`, {
    statusCode: 200,
    body: { success: true, data: { reviews, total: reviews.length } },
  }).as("getReviews");
}

function interceptRelatedProducts() {
  cy.intercept("GET", "/api/products*", {
    statusCode: 200,
    body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1, limit: 4 } },
  }).as("related");
}

function interceptHasPurchased(hasPurchased: boolean) {
  cy.intercept("GET", `/api/account/orders/has-purchased*`, {
    statusCode: 200,
    body: { success: true, data: { hasPurchased } },
  }).as("hasPurchased");
}

// ── Seed test user before suite ──────────────────────────────────────────────
before(() => {
  cy.task("seedTestUser", {
    email:    Cypress.env("TEST_USER_EMAIL"),
    password: Cypress.env("TEST_USER_PASSWORD"),
    name:     "Test Customer",
  });
  cy.task("seedTestProduct", {
    slug:         PRODUCT_SLUG,
    name:         mockProduct.name,
    description:  mockProduct.description,
    price:        mockProduct.price,
    images:       mockProduct.images,
    category:     mockProduct.category,
    brand:        mockProduct.brand,
    unit:         mockProduct.unit,
    inStock:      mockProduct.inStock,
    rating:       mockProduct.rating,
    reviewCount:  mockProduct.reviewCount,
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Verified Purchase Badge", () => {
  beforeEach(() => {
    interceptReviewsApi();
    interceptRelatedProducts();
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
  });

  it("shows the Verified Purchase badge on verified reviews", () => {
    cy.contains("Verified Purchase").should("be.visible");
  });

  it("does not show Verified Purchase badge on unverified reviews", () => {
    cy.contains("Average").closest("[data-testid='review-card'], article, li")
      .should("not.contain", "Verified Purchase");
  });

  it("renders star ratings on review cards", () => {
    cy.get("svg[aria-label*='star'], [data-testid='review-stars']", { timeout: 5000 }).should("exist");
  });

  it("shows reviewer name on review cards", () => {
    cy.contains("Alice Smith").should("be.visible");
    cy.contains("Bob Jones").should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Guest Users (No Auth)", () => {
  beforeEach(() => {
    interceptReviewsApi();
    interceptRelatedProducts();
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
  });

  it("does not show the review submission form for guests", () => {
    cy.get('[data-testid="review-form"], form[aria-label*="review" i]').should("not.exist");
  });

  it("shows a sign-in prompt for guests who want to review", () => {
    cy.contains(/sign in to (write|leave|submit) a review|login to review/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Logged-In User Without Purchase", () => {
  beforeEach(() => {
    interceptReviewsApi();
    interceptRelatedProducts();
    interceptHasPurchased(false);

    loginTestUser();
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
    cy.wait("@hasPurchased");
  });

  it("calls the has-purchased API for authenticated users", () => {
    cy.get("@hasPurchased.all").should("have.length.gte", 1);
  });

  it("shows a purchase-required message instead of the review form", () => {
    cy.contains(/purchase (required|to review|this product)|you (can only|must) (review|purchase)/i, { timeout: 5000 })
      .should("be.visible");
  });

  it("does not show the review submission form", () => {
    cy.get('[data-testid="review-form"]').should("not.exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Logged-In User With Verified Purchase", () => {
  beforeEach(() => {
    interceptReviewsApi([]);
    interceptRelatedProducts();
    interceptHasPurchased(true);

    loginTestUser();
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
    cy.wait("@hasPurchased");
  });

  it("shows the review form for users who have purchased", () => {
    cy.get('[data-testid="review-form"], [aria-label*="review" i], form', { timeout: 5000 })
      .should("exist");
  });

  it("review form contains a rating selector", () => {
    cy.get('input[type="radio"][name*="rating" i], [data-testid*="rating"]', { timeout: 5000 })
      .should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Submitting a Review (Verified Purchase)", () => {
  beforeEach(() => {
    interceptReviewsApi([]);
    interceptRelatedProducts();
    interceptHasPurchased(true);

    cy.intercept("POST", `/api/products/${PRODUCT_SLUG}/reviews`, {
      statusCode: 201,
      body: {
        success: true,
        data: {
          _id:               "rev003",
          userId:            "user001",
          userName:          "Test Customer",
          rating:            4,
          title:             "Great product",
          comment:           "Really good quality.",
          isVerifiedPurchase: true,
          createdAt:         new Date().toISOString(),
        },
      },
    }).as("submitReview");

    loginTestUser();
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
    cy.wait("@hasPurchased");
  });

  it("allows submission of a verified review", () => {
    cy.get('input[type="radio"][value="4"], [data-testid="rating-4"]', { timeout: 5000 }).click();
    cy.get('input[placeholder*="title" i], [name="title"]').type("Great product");
    cy.get('textarea[placeholder*="comment" i], textarea[name="comment"]').type("Really good quality.");
    cy.get('[data-testid="submit-review"], button[type="submit"]').click();
    cy.wait("@submitReview");
  });

  it("shows a success toast after review submission", () => {
    cy.get('input[type="radio"][value="4"], [data-testid="rating-4"]', { timeout: 5000 }).click();
    cy.get('input[placeholder*="title" i], [name="title"]').type("Great product");
    cy.get('textarea[placeholder*="comment" i], textarea[name="comment"]').type("Really good quality.");
    cy.get('[data-testid="submit-review"], button[type="submit"]').click();
    cy.wait("@submitReview");
    cy.get('[data-sonner-toast], [role="status"], [aria-live]', { timeout: 6000 }).should("exist");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — API Enforcement (Server-Side Gate)", () => {
  it("returns 403 when an unauthenticated user attempts to POST a review", () => {
    cy.request({
      method:           "POST",
      url:              `/api/products/${PRODUCT_SLUG}/reviews`,
      body:             { rating: 5, title: "Good", comment: "Nice product." },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Empty State", () => {
  beforeEach(() => {
    interceptReviewsApi([]);
    interceptRelatedProducts();
    loginTestUser();
    interceptHasPurchased(true);
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
  });

  it("shows a no-reviews message when there are no reviews", () => {
    cy.contains(/no reviews yet|be the first|write a review/i).should("be.visible");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Reviews — Mobile Responsiveness", () => {
  beforeEach(() => {
    interceptReviewsApi();
    interceptRelatedProducts();
    cy.viewport("iphone-x");
    cy.visit(`/products/${PRODUCT_SLUG}`);
    cy.wait("@getReviews");
  });

  it("renders review cards correctly on mobile", () => {
    cy.contains("Alice Smith").should("be.visible");
  });

  it("shows Verified Purchase badge on mobile", () => {
    cy.contains("Verified Purchase").should("be.visible");
  });
});
