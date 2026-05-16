/// <reference types="cypress" />

/*
 * E2E — Products
 * Tests the product listing page, search, filtering, sorting, and
 * the product detail page. API calls are intercepted.
 */

const PRODUCTS_STUB = {
  success: true,
  data: {
    products: [
      {
        _id:           "prod001",
        name:          "Organic Full-Fat Milk 2L",
        slug:          "organic-full-fat-milk-2l",
        price:         1.89,
        originalPrice: 2.29,
        images:        ["/images/placeholder.webp"],
        category:      "Fresh Food",
        subcategory:   "Dairy",
        brand:         "Lakeland Dairy",
        unit:          "2L",
        inStock:       true,
        rating:        4.5,
        reviewCount:   120,
        badge:         "sale",
        deliveryOptions: ["express", "standard"],
      },
      {
        _id:           "prod002",
        name:          "Sourdough Loaf 800g",
        slug:          "sourdough-loaf-800g",
        price:         2.50,
        originalPrice: null,
        images:        ["/images/placeholder.webp"],
        category:      "Bakery",
        subcategory:   null,
        brand:         "Artisan Bakes",
        unit:          "800g",
        inStock:       true,
        rating:        4.8,
        reviewCount:   87,
        badge:         null,
        deliveryOptions: ["standard"],
      },
    ],
    total:      2,
    page:       1,
    totalPages: 1,
    limit:      12,
  },
};

const EMPTY_PRODUCTS_STUB = {
  success: true,
  data: { products: [], total: 0, page: 1, totalPages: 0, limit: 12 },
};

const BRANDS_STUB = { success: true, data: ["Artisan Bakes", "Lakeland Dairy"] };

function interceptProducts(body = PRODUCTS_STUB) {
  cy.intercept("GET", "/api/products*", body).as("getProducts");
}

function interceptMeta(
  brands        = ["Lakeland Dairy", "Artisan Bakes"],
  subcategories = ["Dairy"],
) {
  cy.intercept("GET", "/api/products/meta*", {
    success: true,
    data: { brands, subcategories },
  }).as("getFilterMeta");
}

function interceptBrands(data = BRANDS_STUB.data) {
  cy.intercept("GET", "/api/brands*", { success: true, data }).as("getBrands");
}

// ── Listing page ──────────────────────────────────────────────────────────────

describe("Products — Listing Page", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products");
  });

  it("renders the products page heading", () => {
    cy.get("h1, h2").should("exist");
  });

  it("displays a product card for each returned product", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
    cy.contains("Sourdough Loaf 800g").should("be.visible");
  });

  it("shows the sort control", () => {
    cy.get("select, [role='combobox']").should("exist");
  });

  it("renders the filters sidebar on desktop", () => {
    cy.viewport(1280, 800);
    cy.get("[data-testid='filters-sidebar']").should("be.visible");
  });

  it("shows the mobile filters button on small screens", () => {
    cy.viewport(375, 812);
    cy.get("[data-testid='mobile-filters-button']").should("be.visible");
  });

  it("shows total result count", () => {
    cy.contains(/2 products|2 results/i).should("exist");
  });
});

// ── Filter sections collapsed by default ──────────────────────────────────────

describe("Products — Filter Sections Collapsed by Default", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products");
  });

  it("all filter section content is hidden on initial load", () => {
    cy.get("[data-testid='filters-sidebar']").within(() => {
      // Section contents should not be visible — accordion is collapsed
      cy.get("[data-testid='category-filter-all']").should("not.exist");
      cy.get("[data-testid='rating-filter-4']").should("not.exist");
      cy.get("[data-testid='discount-filter-10']").should("not.exist");
      cy.get("[data-testid='instock-toggle']").should("not.exist");
      cy.get("[data-testid='price-min-input']").should("not.exist");
    });
  });

  it("section header is visible but content hidden before expansion", () => {
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/category/i).should("be.visible");
      cy.contains(/price range/i).should("be.visible");
    });
  });

  it("clicking a section header expands it", () => {
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/category/i).click();
      cy.get("[data-testid='category-filter-all']").should("be.visible");
    });
  });

  it("clicking an expanded section collapses it again", () => {
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/category/i).click(); // expand
      cy.get("[data-testid='category-filter-all']").should("be.visible");
      cy.contains(/category/i).click(); // collapse
      cy.get("[data-testid='category-filter-all']").should("not.exist");
    });
  });

  it("sections remain independent — expanding one does not open others", () => {
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/category/i).click(); // expand category only
      cy.get("[data-testid='rating-filter-4']").should("not.exist");
      cy.get("[data-testid='price-min-input']").should("not.exist");
    });
  });
});

// ── Price filter validation ───────────────────────────────────────────────────

describe("Products — Price Filter Validation", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/price range/i).click();
    });
  });

  it("does NOT update URL when only min price is entered", () => {
    cy.get("[data-testid='price-min-input']").type("100");
    cy.wait(800); // past debounce
    cy.url().should("not.include", "minPrice=");
  });

  it("does NOT update URL when only max price is entered", () => {
    cy.get("[data-testid='price-max-input']").type("500");
    cy.wait(800);
    cy.url().should("not.include", "maxPrice=");
  });

  it("DOES update URL when BOTH min and max are entered", () => {
    interceptProducts();
    cy.get("[data-testid='price-min-input']").type("100");
    cy.get("[data-testid='price-max-input']").type("500");
    cy.wait(800);
    cy.url().should("include", "minPrice=100");
    cy.url().should("include", "maxPrice=500");
  });

  it("shows a hint when only one bound is entered", () => {
    cy.get("[data-testid='price-min-input']").type("100");
    cy.contains(/enter both min and max/i).should("be.visible");
  });

  it("clears both price inputs and URL params when price chip is removed", () => {
    interceptProducts();
    cy.visit("/products?minPrice=100&maxPrice=500");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/price range/i).click();
    });

    // Verify inputs are pre-filled from URL
    cy.get("[data-testid='price-min-input']").should("have.value", "100");
    cy.get("[data-testid='price-max-input']").should("have.value", "500");

    // Remove the chip
    cy.get("[data-testid='active-filters']").within(() => {
      cy.get("button[aria-label*='Remove']").first().click();
    });

    // Both URL params should be gone
    cy.url().should("not.include", "minPrice=");
    cy.url().should("not.include", "maxPrice=");

    // Both inputs should be cleared
    cy.get("[data-testid='price-min-input']").should("have.value", "");
    cy.get("[data-testid='price-max-input']").should("have.value", "");
  });

  it("clear-all resets price inputs and URL params", () => {
    interceptProducts();
    cy.visit("/products?minPrice=100&maxPrice=500&rating=4");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.url().should("not.include", "minPrice=");
    cy.url().should("not.include", "maxPrice=");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/price range/i).click();
    });
    cy.get("[data-testid='price-min-input']").should("have.value", "");
    cy.get("[data-testid='price-max-input']").should("have.value", "");
  });

  it("price chip is absent when only one bound is in the URL", () => {
    cy.visit("/products?minPrice=100");
    cy.get("[data-testid='active-filters']").should("not.exist");
  });
});

// ── Brands API ────────────────────────────────────────────────────────────────

describe("Products — Backend Brands Fetching", () => {
  it("GET /api/brands returns a list of brands", () => {
    interceptBrands();
    cy.request("/api/brands").then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.eq(true);
      expect(res.body.data).to.be.an("array");
    });
  });

  it("brands list in sidebar comes from the backend", () => {
    interceptProducts();
    interceptMeta(["Lakeland Dairy", "Artisan Bakes"]);
    cy.viewport(1280, 800);
    cy.visit("/products");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/brand/i).click();
    });
    cy.get("[data-testid='brand-checkbox-Lakeland Dairy']").should("exist");
    cy.get("[data-testid='brand-checkbox-Artisan Bakes']").should("exist");
  });
});

// ── Category redirect ─────────────────────────────────────────────────────────

describe("Products — Category Redirect from Categories Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/categories*", {
      success: true,
      data: [
        {
          _id:          "cat001",
          name:         "Fresh Food",
          slug:         "fresh-food",
          emoji:        "🥦",
          color:        "bg-green-50",
          textColor:    "text-green-700",
          productCount: 42,
          isActive:     true,
        },
      ],
    }).as("getCategories");
    cy.visit("/categories");
  });

  it("category tile links to /products?category=slug", () => {
    cy.contains("Fresh Food")
      .closest("a")
      .should("have.attr", "href", "/products?category=fresh-food");
  });

  it("clicking a category tile navigates to products page with category filter", () => {
    interceptProducts();
    interceptMeta();
    cy.contains("Fresh Food").click();
    cy.url().should("include", "/products");
    cy.url().should("include", "category=fresh-food");
  });
});

// ── URL sync & persistence ────────────────────────────────────────────────────

describe("Products — URL Param Persistence", () => {
  it("preserves all filters in URL on page load", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?category=fresh-food&rating=4&discount=10&inStock=true");
    cy.url().should("include", "category=fresh-food");
    cy.url().should("include", "rating=4");
    cy.url().should("include", "discount=10");
    cy.url().should("include", "inStock=true");
  });

  it("shows active filter chips for URL params on load", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?category=fresh-food&inStock=true&rating=4");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains(/fresh.food/i).should("exist");
      cy.contains(/in stock/i).should("exist");
      cy.contains(/4 stars/i).should("exist");
    });
  });

  it("preserves multi-select brand filters in URL", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?brand=Lakeland+Dairy,Artisan+Bakes");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("Lakeland Dairy").should("exist");
      cy.contains("Artisan Bakes").should("exist");
    });
  });

  it("filter changes reset pagination to page 1", () => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products?page=3");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/customer ratings/i).click();
    });
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("not.include", "page=3");
    cy.url().should("include", "rating=4");
  });
});

// ── Filters sidebar interactions ──────────────────────────────────────────────

describe("Products — Filters Sidebar", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products");
  });

  it("clicking a category updates URL after expanding section", () => {
    interceptProducts();
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/category/i).click();
    });
    cy.get("[data-testid='category-filter-fresh-food']").click();
    cy.url().should("include", "category=fresh-food");
  });

  it("clicking a rating filter updates the URL", () => {
    interceptProducts();
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/customer ratings/i).click();
    });
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("include", "rating=4");
  });

  it("clicking rating filter again removes it (toggle)", () => {
    interceptProducts();
    cy.visit("/products?rating=4");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/customer ratings/i).click();
    });
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("not.include", "rating=4");
  });

  it("clicking a discount filter updates the URL", () => {
    interceptProducts();
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/discount/i).click();
    });
    cy.get("[data-testid='discount-filter-25']").click();
    cy.url().should("include", "discount=25");
  });

  it("brand search filters the visible list", () => {
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/brand/i).click();
    });
    cy.get("[data-testid='brand-search-input']").type("Lakeland");
    cy.get("[data-testid='brand-checkbox-Lakeland Dairy']").should("exist");
    cy.get("[data-testid='brand-checkbox-Artisan Bakes']").should("not.exist");
  });

  it("selecting a brand adds it to the URL", () => {
    interceptProducts();
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/brand/i).click();
    });
    cy.get("[data-testid='brand-checkbox-Lakeland Dairy']").check({ force: true });
    cy.url().should("include", "brand=");
    cy.url().should("include", "Lakeland");
  });

  it("clear-all button removes all filter params", () => {
    interceptProducts();
    cy.visit("/products?category=fresh-food&rating=4&inStock=true");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.url().should("not.include", "category=");
    cy.url().should("not.include", "rating=");
    cy.url().should("not.include", "inStock=");
  });
});

// ── Mobile filter drawer ──────────────────────────────────────────────────────

describe("Products — Mobile Filter Drawer", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.viewport(375, 812);
    cy.visit("/products");
  });

  it("opens the filter drawer when the Filters button is clicked", () => {
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.get("[role='dialog']").should("be.visible");
  });

  it("filter sections inside drawer are collapsed by default", () => {
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.get("[role='dialog']").within(() => {
      cy.get("[data-testid='category-filter-all']").should("not.exist");
      cy.get("[data-testid='rating-filter-4']").should("not.exist");
    });
  });

  it("can expand a section inside the drawer", () => {
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains(/category/i).click();
      cy.get("[data-testid='category-filter-all']").should("be.visible");
    });
  });

  it("closes the drawer when close button is clicked", () => {
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.get("[data-testid='close-mobile-filters']").click();
    cy.get("[role='dialog']").should("not.exist");
  });

  it("closes the drawer when Show Results is clicked", () => {
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.get("[data-testid='apply-mobile-filters']").click();
    cy.get("[role='dialog']").should("not.exist");
  });

  it("closes the drawer when backdrop is clicked", () => {
    cy.get("[data-testid='mobile-filters-button']").click();
    cy.get("[role='dialog']").find(".absolute.inset-0").click({ force: true });
    cy.get("[role='dialog']").should("not.exist");
  });
});

// ── Sort control ──────────────────────────────────────────────────────────────

describe("Products — Sort Control", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products");
  });

  it("contains all sort options including Popularity", () => {
    cy.get("select").contains("Most Popular").should("exist");
    cy.get("select").contains("Price: Low to High").should("exist");
    cy.get("select").contains("Top Rated").should("exist");
    cy.get("select").contains("Newest").should("exist");
  });

  it("changing sort updates the URL sortBy param", () => {
    interceptProducts();
    cy.get("select").select("Price: Low to High");
    cy.url().should("include", "sortBy=price-asc");
  });

  it("selecting popularity sort updates the URL", () => {
    interceptProducts();
    cy.get("select").select("Most Popular");
    cy.url().should("include", "sortBy=popularity");
  });

  it("preserves all filters when changing sort", () => {
    interceptProducts();
    cy.visit("/products?category=fresh-food&rating=4");
    cy.get("select").select("Price: Low to High");
    cy.url().should("include", "category=fresh-food");
    cy.url().should("include", "rating=4");
    cy.url().should("include", "sortBy=price-asc");
  });
});

// ── Active filter chips ───────────────────────────────────────────────────────

describe("Products — Active Filter Chips", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
  });

  it("removing a chip removes that param from URL", () => {
    cy.visit("/products?rating=4&inStock=true");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains(/4 stars/i).closest("span").find("button").click();
    });
    cy.url().should("not.include", "rating=4");
    cy.url().should("include", "inStock=true");
  });

  it("removing a brand chip removes only that brand", () => {
    interceptProducts();
    cy.visit("/products?brand=Lakeland+Dairy,Artisan+Bakes");
    cy.get("[data-testid='remove-filter-Lakeland Dairy']").click();
    cy.url().should("not.include", "Lakeland");
    cy.url().should("include", "Artisan");
  });

  it("price chip only appears when BOTH min and max are present", () => {
    cy.visit("/products?minPrice=100&maxPrice=500");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("₹100 – ₹500").should("exist");
    });
  });

  it("no price chip when only minPrice is set", () => {
    cy.visit("/products?minPrice=100");
    cy.get("[data-testid='active-filters']").should("not.exist");
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe("Products — Empty State", () => {
  it("shows an empty state when no products match filters", () => {
    cy.intercept("GET", "/api/products*", EMPTY_PRODUCTS_STUB).as("emptyProducts");
    interceptMeta();
    cy.visit("/products?category=electronics&brand=Unknown");
    cy.contains(/no products|no results|empty/i).should("exist");
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

describe("Products — Search", () => {
  it("updates the URL query string when searching from the navbar", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products");
    cy.get('[role="search"]').within(() => {
      cy.get('input[type="text"]').type("bread");
      cy.get('[type="submit"]').click();
    });
    cy.url().should("include", "q=bread");
  });
});

// ── Detail page ───────────────────────────────────────────────────────────────

describe("Products — Detail Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/products/organic-full-fat-milk-2l", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id:           "prod001",
          name:          "Organic Full-Fat Milk 2L",
          slug:          "organic-full-fat-milk-2l",
          description:   "Rich, creamy organic full-fat milk.",
          price:         1.89,
          originalPrice: 2.29,
          images:        ["/images/placeholder.webp"],
          category:      "Fresh Food",
          brand:         "Lakeland Dairy",
          unit:          "2L",
          inStock:       true,
          rating:        4.5,
          reviewCount:   120,
          badge:         "sale",
          deliveryOptions: ["express", "standard"],
        },
      },
    }).as("getProduct");

    cy.intercept("GET", "/api/reviews*", {
      statusCode: 200,
      body: { success: true, data: { reviews: [], total: 0 } },
    }).as("getReviews");

    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 1, limit: 4 } },
    }).as("relatedProducts");

    cy.visit("/products/organic-full-fat-milk-2l");
  });

  it("displays the product name on the detail page", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });

  it("shows the product price", () => {
    cy.contains("1.89").should("be.visible");
  });

  it("shows an Add to Cart button", () => {
    cy.contains(/add to cart|add to bag/i).should("be.visible");
  });

  it("shows an Add to Wishlist button", () => {
    cy.get('[aria-label*="wishlist"], [aria-label*="Wishlist"]').should("exist");
  });
});

// ── Search results page ───────────────────────────────────────────────────────

describe("Products — Search Results Page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/products*", {
      success: true,
      data: {
        products: [{
          _id:        "prod001",
          name:       "Organic Full-Fat Milk 2L",
          slug:       "organic-full-fat-milk-2l",
          price:      1.89,
          images:     ["/images/placeholder.webp"],
          category:   "Fresh Food",
          brand:      "Lakeland Dairy",
          unit:       "2L",
          inStock:    true,
          rating:     4.5,
          reviewCount: 10,
        }],
        total: 1, page: 1, totalPages: 1, limit: 12,
      },
    }).as("searchProducts");

    cy.visit("/search?q=milk");
  });

  it("shows the search query in the heading", () => {
    cy.contains("milk").should("exist");
  });

  it("displays a result matching the query", () => {
    cy.contains("Organic Full-Fat Milk 2L").should("be.visible");
  });
});

// ── Sorting + pagination together ─────────────────────────────────────────────

describe("Products — Sort + Pagination", () => {
  it("preserves sort and page in URL simultaneously", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?sortBy=price-asc&page=2");
    cy.url().should("include", "sortBy=price-asc");
    cy.url().should("include", "page=2");
  });
});

// ── Invalid URL params (defensive / no crash) ─────────────────────────────────

describe("Products — Invalid URL Params (Defensive)", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
  });

  it("non-numeric rating param does not crash the page", () => {
    cy.visit("/products?rating=abc");
    cy.get("h1, h2").should("exist");
    cy.get("[data-testid='filters-sidebar']").should("exist");
  });

  it("non-numeric discount param does not crash the page", () => {
    cy.visit("/products?discount=xyz");
    cy.get("h1, h2").should("exist");
    cy.get("[data-testid='filters-sidebar']").should("exist");
  });

  it("float rating param does not crash the page", () => {
    cy.visit("/products?rating=4.5");
    cy.get("h1, h2").should("exist");
  });

  it("float discount param does not crash the page", () => {
    cy.visit("/products?discount=24.9");
    cy.get("h1, h2").should("exist");
  });

  it("non-numeric price params do not crash the page", () => {
    cy.visit("/products?minPrice=foo&maxPrice=bar");
    cy.get("h1, h2").should("exist");
  });

  it("non-numeric page param does not crash the page", () => {
    cy.visit("/products?page=abc");
    cy.get("h1, h2").should("exist");
  });

  it("API returns 400 for non-integer rating", () => {
    cy.request({ url: "/api/products?rating=abc", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 for float rating", () => {
    cy.request({ url: "/api/products?rating=4.5", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 for float discount", () => {
    cy.request({ url: "/api/products?discount=24.9", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 when only minPrice is provided", () => {
    cy.request({ url: "/api/products?minPrice=100", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 when only maxPrice is provided", () => {
    cy.request({ url: "/api/products?maxPrice=500", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 200 with both minPrice and maxPrice provided", () => {
    cy.request("/api/products?minPrice=100&maxPrice=500").then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.eq(true);
    });
  });

  it("page refresh with filters does not crash", () => {
    cy.visit("/products?category=fresh-food&rating=4&discount=25&inStock=true");
    cy.reload();
    cy.get("h1, h2").should("exist");
    cy.url().should("include", "category=fresh-food");
    cy.url().should("include", "rating=4");
  });

  it("direct URL access with all filter params renders correctly", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?category=fresh-food&brand=Lakeland+Dairy&minPrice=10&maxPrice=50&rating=4&discount=25&inStock=true&delivery=express&sortBy=price-asc&page=1");
    cy.get("h1, h2").should("exist");
    cy.get("[data-testid='active-filters']").should("exist");
  });

  it("filters cleared from URL do not cause runtime crash", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?rating=4&discount=25");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.url().should("not.include", "rating=");
    cy.url().should("not.include", "discount=");
    cy.get("h1, h2").should("exist");
  });
});

// ── Exact rating filter ───────────────────────────────────────────────────────

describe("Products — Exact Rating Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/customer ratings/i).click();
    });
  });

  it("clicking rating=4 sets URL param to exactly 4", () => {
    interceptProducts();
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("include", "rating=4");
  });

  it("clicking rating=3 sets URL param to exactly 3", () => {
    interceptProducts();
    cy.get("[data-testid='rating-filter-3']").click();
    cy.url().should("include", "rating=3");
  });

  it("API receives exact rating param (not a range)", () => {
    cy.intercept("GET", "/api/products*", (req) => {
      expect(req.query.rating).to.eq("4");
      req.reply(PRODUCTS_STUB);
    }).as("exactRating");
    cy.get("[data-testid='rating-filter-4']").click();
    cy.wait("@exactRating");
  });

  it("active chip shows exact star label without range language", () => {
    interceptProducts();
    cy.get("[data-testid='rating-filter-4']").click();
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("4 stars").should("exist");
      cy.contains("& up").should("not.exist");
    });
  });

  it("clicking the same rating again removes the filter (toggle)", () => {
    interceptProducts();
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("include", "rating=4");
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("not.include", "rating=4");
  });

  it("pagination resets to page 1 when rating filter is applied", () => {
    interceptProducts();
    cy.visit("/products?page=3");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/customer ratings/i).click();
    });
    cy.get("[data-testid='rating-filter-4']").click();
    cy.url().should("not.include", "page=3");
    cy.url().should("include", "rating=4");
  });

  it("rating filter combines with sort correctly", () => {
    interceptProducts();
    cy.visit("/products?rating=4");
    cy.get("select").select("Price: Low to High");
    cy.url().should("include", "rating=4");
    cy.url().should("include", "sortBy=price-asc");
  });

  it("rating filter combines with category filter", () => {
    interceptProducts();
    cy.visit("/products?category=fresh-food&rating=4");
    cy.url().should("include", "category=fresh-food");
    cy.url().should("include", "rating=4");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains(/fresh.food/i).should("exist");
      cy.contains("4 stars").should("exist");
    });
  });
});

// ── Exact discount filter ─────────────────────────────────────────────────────

describe("Products — Exact Discount Filter", () => {
  beforeEach(() => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/discount/i).click();
    });
  });

  it("clicking discount=10 sets URL param to exactly 10", () => {
    interceptProducts();
    cy.get("[data-testid='discount-filter-10']").click();
    cy.url().should("include", "discount=10");
  });

  it("clicking discount=25 sets URL param to exactly 25", () => {
    interceptProducts();
    cy.get("[data-testid='discount-filter-25']").click();
    cy.url().should("include", "discount=25");
  });

  it("API receives exact discount param (not a range)", () => {
    cy.intercept("GET", "/api/products*", (req) => {
      expect(req.query.discount).to.eq("25");
      req.reply(PRODUCTS_STUB);
    }).as("exactDiscount");
    cy.get("[data-testid='discount-filter-25']").click();
    cy.wait("@exactDiscount");
  });

  it("active chip shows exact discount label without range language", () => {
    interceptProducts();
    cy.get("[data-testid='discount-filter-25']").click();
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("25% off").should("exist");
      cy.contains("or more").should("not.exist");
    });
  });

  it("clicking the same discount again removes the filter (toggle)", () => {
    interceptProducts();
    cy.get("[data-testid='discount-filter-25']").click();
    cy.url().should("include", "discount=25");
    cy.get("[data-testid='discount-filter-25']").click();
    cy.url().should("not.include", "discount=25");
  });

  it("pagination resets to page 1 when discount filter is applied", () => {
    interceptProducts();
    cy.visit("/products?page=2");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/discount/i).click();
    });
    cy.get("[data-testid='discount-filter-50']").click();
    cy.url().should("not.include", "page=2");
    cy.url().should("include", "discount=50");
  });

  it("discount filter combines with sort correctly", () => {
    interceptProducts();
    cy.visit("/products?discount=25");
    cy.get("select").select("Top Rated");
    cy.url().should("include", "discount=25");
    cy.url().should("include", "sortBy=rating");
  });

  it("discount filter combines with brand filter", () => {
    interceptProducts();
    cy.visit("/products?brand=Lakeland+Dairy&discount=10");
    cy.url().should("include", "brand=");
    cy.url().should("include", "discount=10");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("Lakeland Dairy").should("exist");
      cy.contains("10% off").should("exist");
    });
  });
});

// ── Combined exact filters ────────────────────────────────────────────────────

describe("Products — Combined Exact Filters", () => {
  it("rating + discount + sort all coexist in URL", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?rating=4&discount=25&sortBy=price-asc");
    cy.url().should("include", "rating=4");
    cy.url().should("include", "discount=25");
    cy.url().should("include", "sortBy=price-asc");
  });

  it("active chips show both rating and discount chips simultaneously", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?rating=4&discount=25");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("4 stars").should("exist");
      cy.contains("25% off").should("exist");
    });
  });

  it("removing rating chip leaves discount chip intact", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?rating=4&discount=25");
    cy.get("[data-testid='remove-filter-4 stars']").click();
    cy.url().should("not.include", "rating=4");
    cy.url().should("include", "discount=25");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("25% off").should("exist");
    });
  });

  it("removing discount chip leaves rating chip intact", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?rating=4&discount=25");
    cy.get("[data-testid='remove-filter-25% off']").click();
    cy.url().should("not.include", "discount=25");
    cy.url().should("include", "rating=4");
    cy.get("[data-testid='active-filters']").within(() => {
      cy.contains("4 stars").should("exist");
    });
  });

  it("clear-all removes both rating and discount params", () => {
    interceptProducts();
    interceptMeta();
    cy.visit("/products?rating=4&discount=25&category=fresh-food");
    cy.get("[data-testid='clear-all-filters']").click();
    cy.url().should("not.include", "rating=");
    cy.url().should("not.include", "discount=");
    cy.url().should("not.include", "category=");
  });

  it("combined filters + pagination: page resets on any filter change", () => {
    interceptProducts();
    interceptMeta();
    cy.viewport(1280, 800);
    cy.visit("/products?rating=4&page=3");
    cy.get("[data-testid='filters-sidebar']").within(() => {
      cy.contains(/discount/i).click();
    });
    cy.get("[data-testid='discount-filter-25']").click();
    cy.url().should("not.include", "page=3");
    cy.url().should("include", "rating=4");
    cy.url().should("include", "discount=25");
  });
});

export {};
