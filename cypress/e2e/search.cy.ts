/**
 * E2E: Search — SearchBar & Search Results Page
 *
 * Covers:
 *  - SearchBar: typing 2+ chars calls /api/search/suggestions
 *  - SearchBar: dropdown renders category, brand, product suggestion groups
 *  - SearchBar: clicking a category suggestion navigates to /categories/:slug
 *  - SearchBar: clicking a product suggestion navigates to /products/:slug
 *  - SearchBar: clicking a brand suggestion navigates to /search?q=brand
 *  - SearchBar: "See all results" footer navigates to /search?q=query
 *  - SearchBar: form submit navigates to /search?q=query
 *  - SearchBar: clear button empties input and closes dropdown
 *  - SearchBar: query shorter than 2 chars does NOT open dropdown
 *  - SearchBar: empty suggestions response keeps dropdown closed
 *  - SearchBar: Escape key closes dropdown
 *  - Search results page: no-query state shows "Search Products" heading
 *  - Search results page: query shown in heading with result count
 *  - Search results page: no-results shows NoResults component
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SUGGESTIONS = {
  categories: [
    { _id: "cat001", name: "Dairy & Eggs", slug: "dairy-eggs", emoji: "🥛" },
  ],
  brands: ["Amul"],
  products: [
    {
      _id:      "prod001",
      name:     "Amul Gold Full Cream Milk",
      slug:     "amul-gold-full-cream-milk",
      image:    "/images/placeholder-product.webp",
      price:    89,
      category: "Dairy & Eggs",
      brand:    "Amul",
    },
  ],
};

const EMPTY_SUGGESTIONS = { categories: [], brands: [], products: [] };

// ── Helper ────────────────────────────────────────────────────────────────────

function interceptSuggestions(
  data: typeof MOCK_SUGGESTIONS | typeof EMPTY_SUGGESTIONS = MOCK_SUGGESTIONS,
) {
  cy.intercept("GET", "/api/search/suggestions*", {
    statusCode: 200,
    body: { success: true, data },
  }).as("getSuggestions");
}

// Cypress won't trigger a debounced fetch using .type() alone — we type slowly
// enough for the 280 ms debounce to fire.
const TYPE_OPTS = { delay: 50 };

// ── Suite 1: SearchBar — dropdown opens and populates ────────────────────────

describe("SearchBar — dropdown suggestions", () => {
  beforeEach(() => {
    interceptSuggestions();
    cy.visit("/");
  });

  it("calls /api/search/suggestions when 2+ chars are typed", () => {
    cy.get('[data-testid="search-input"]').first().type("mi", TYPE_OPTS);
    cy.wait("@getSuggestions");
  });

  it("shows the suggestions dropdown after API response", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="search-suggestions"]').first().should("be.visible");
  });

  it("renders category suggestions inside the dropdown", () => {
    cy.get('[data-testid="search-input"]').first().type("dairy", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-category"]').first().should("contain", MOCK_SUGGESTIONS.categories[0].name);
  });

  it("renders brand suggestions inside the dropdown", () => {
    cy.get('[data-testid="search-input"]').first().type("amul", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-brand"]').first().should("contain", MOCK_SUGGESTIONS.brands[0]);
  });

  it("renders product suggestions inside the dropdown", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-product"]').first().should("contain", MOCK_SUGGESTIONS.products[0].name);
  });

  it("shows the 'See all results' footer button", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="search-see-all"]').first().should("be.visible");
  });

  it("shows product price in suggestion row", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-product"]').first().should("contain", "89");
  });
});

// ── Suite 2: SearchBar — navigation from suggestions ─────────────────────────

describe("SearchBar — suggestion navigation", () => {
  beforeEach(() => {
    interceptSuggestions();
    cy.visit("/");
  });

  it("clicking a category suggestion navigates to /categories/:slug", () => {
    cy.get('[data-testid="search-input"]').first().type("dairy", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-category"]').first().trigger("mousedown");
    cy.url().should("include", `/categories/${MOCK_SUGGESTIONS.categories[0].slug}`);
  });

  it("clicking a product suggestion navigates to /products/:slug", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-product"]').first().trigger("mousedown");
    cy.url().should("include", `/products/${MOCK_SUGGESTIONS.products[0].slug}`);
  });

  it("clicking a brand suggestion navigates to /search with brand as query", () => {
    cy.get('[data-testid="search-input"]').first().type("amul", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="suggestion-brand"]').first().trigger("mousedown");
    cy.url().should("include", `/search`);
    cy.url().should("include", `q=Amul`);
  });

  it("'See all results' navigates to /search?q=typed-query", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="search-see-all"]').first().trigger("mousedown");
    cy.url().should("include", "/search");
    cy.url().should("include", "q=milk");
  });
});

// ── Suite 3: SearchBar — form submit ─────────────────────────────────────────

describe("SearchBar — form submit", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("submitting the form navigates to /search?q=query", () => {
    cy.get('[data-testid="search-input"]').first().type("eggs{enter}");
    cy.url().should("include", "/search");
    cy.url().should("include", "q=eggs");
  });

  it("clicking the submit button navigates to /search?q=query", () => {
    cy.get('[data-testid="search-input"]').first().type("bread", TYPE_OPTS);
    cy.get('[data-testid="search-submit"]').first().click();
    cy.url().should("include", "/search");
    cy.url().should("include", "q=bread");
  });

  it("submitting with empty input stays on the same page", () => {
    cy.get('[data-testid="search-submit"]').first().click();
    cy.url().should("not.include", "/search");
  });
});

// ── Suite 4: SearchBar — clear button ────────────────────────────────────────

describe("SearchBar — clear button", () => {
  beforeEach(() => {
    interceptSuggestions();
    cy.visit("/");
  });

  it("clear button is not visible when input is empty", () => {
    cy.get('[data-testid="search-clear"]').should("not.exist");
  });

  it("clear button appears after typing", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.get('[data-testid="search-clear"]').first().should("be.visible");
  });

  it("clicking clear button empties the input", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="search-clear"]').first().click();
    cy.get('[data-testid="search-input"]').first().should("have.value", "");
  });

  it("clicking clear button closes the suggestions dropdown", () => {
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[data-testid="search-suggestions"]').first().should("be.visible");
    cy.get('[data-testid="search-clear"]').first().click();
    cy.get('[data-testid="search-suggestions"]').should("not.exist");
  });
});

// ── Suite 5: SearchBar — dropdown closed for short / empty queries ────────────

describe("SearchBar — short query suppression", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("typing only 1 character does not open the suggestions dropdown", () => {
    cy.intercept("GET", "/api/search/suggestions*").as("maybe");
    cy.get('[data-testid="search-input"]').first().type("m", TYPE_OPTS);
    cy.get('[data-testid="search-suggestions"]').should("not.exist");
  });

  it("shows no-results state in dropdown when API returns empty suggestions", () => {
    interceptSuggestions(EMPTY_SUGGESTIONS);
    cy.get('[data-testid="search-input"]').first().type("zzznoresult", TYPE_OPTS);
    cy.wait("@getSuggestions");
    // Dropdown now opens with a no-results message instead of closing silently
    cy.get('[data-testid="search-suggestions"]').first().should("be.visible");
    cy.get('[data-testid="search-no-results"]').first().should("be.visible");
  });
});

// ── Suite 6: SearchBar — keyboard navigation ─────────────────────────────────

describe("SearchBar — keyboard navigation", () => {
  beforeEach(() => {
    interceptSuggestions();
    cy.visit("/");
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
  });

  it("Escape key closes the dropdown", () => {
    cy.get('[data-testid="search-suggestions"]').first().should("be.visible");
    cy.get('[data-testid="search-input"]').first().type("{esc}");
    cy.get('[data-testid="search-suggestions"]').should("not.exist");
  });

  it("ArrowDown key moves focus to first suggestion", () => {
    cy.get('[data-testid="search-input"]').first().type("{downArrow}");
    cy.get('[role="option"][aria-selected="true"]').first().should("be.visible");
  });
});

// ── Suite 7: Search results page — no query ───────────────────────────────────

describe("Search results page — no query", () => {
  it("shows 'Search Products' heading when no query given", () => {
    cy.visit("/search");
    cy.contains("h1", "Search Products").should("be.visible");
  });

  it("shows 'Use the search bar above' helper text", () => {
    cy.visit("/search");
    cy.contains("Use the search bar above to find products").should("be.visible");
  });

  it("does not show any product cards", () => {
    cy.visit("/search");
    cy.get("article").should("not.exist");
  });
});

// ── Suite 8: Search results page — results found ─────────────────────────────

describe("Search results page — with query", () => {
  it("shows the query in the heading", () => {
    // The search page is server-rendered; intercept is not needed for heading check
    cy.visit("/search?q=milk");
    cy.contains("Results for").should("be.visible");
    cy.contains("milk").should("be.visible");
  });

  it("page title includes the search query", () => {
    cy.visit("/search?q=bread");
    cy.title().should("contain", "bread");
  });
});

// ── Suite 9: Search results page — no results ────────────────────────────────

describe("Search results page — no results", () => {
  it("shows 'No results for' heading for an unrecognised query", () => {
    cy.visit("/search?q=zzznoresultxyz99");
    cy.contains("No results for").should("be.visible");
  });

  it("shows 'Browse All Products' link in no-results state", () => {
    cy.visit("/search?q=zzznoresultxyz99");
    cy.contains("a", "Browse All Products")
      .should("have.attr", "href", "/products");
  });

  it("shows popular category links in no-results state", () => {
    cy.visit("/search?q=zzznoresultxyz99");
    cy.contains("Browse popular categories").should("be.visible");
    cy.contains("Fresh Food").should("be.visible");
  });

  it("shows search tips in no-results state", () => {
    cy.visit("/search?q=zzznoresultxyz99");
    cy.contains("Check your spelling").should("be.visible");
  });
});

// ── Suite 10: Search bar accessible attributes ────────────────────────────────

describe("SearchBar — accessibility", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("search input has aria-label 'Search products'", () => {
    cy.get('[data-testid="search-input"]').first()
      .should("have.attr", "aria-label", "Search products");
  });

  it("search form has role='search'", () => {
    cy.get('form[role="search"]').should("exist");
  });

  it("suggestions listbox has role='listbox'", () => {
    interceptSuggestions();
    cy.get('[data-testid="search-input"]').first().type("milk", TYPE_OPTS);
    cy.wait("@getSuggestions");
    cy.get('[role="listbox"]').should("be.visible");
  });
});
