# Changelog

All notable changes to this project are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Changed

- All client-side REST calls migrated from `fetch` to `axios`

### Fixed

- Wishlist emptying after adding a product (race condition in `useWishlistSync`)

---

## [0.14.0] — 2026-05-07

### Added

- Wishlist persisted to MongoDB (`Wishlist` model: one doc per user with `productIds[]`)
- `wishlist.service`: `addToWishlist`, `removeFromWishlist`, `syncWishlist` with mock fallback
- `PUT /api/account/wishlist/sync` — merges local wishlist into server on login
- `GET/POST /api/account/wishlist` and `DELETE /api/account/wishlist/[productId]`
- `useWishlistSync` hook — runs once per session, syncs local store with server
- Cross-device wishlist: logging in on any device shows the full saved list

---

## [0.13.0] — 2026-05-07

### Added

- Wishlist / Favourites feature with localStorage persistence (Zustand)
- Heart toggle button on every product card (`WishlistButton`)
- `/account/wishlist` page — saved items grid with add-to-cart and remove actions
- Navbar: heart icon with red count badge; wishlist link in account dropdown

---

## [0.12.0] — 2026-05-07

### Added

- Order history: `GET /api/account/orders` and `/api/account/orders/[orderNumber]` (JWT-protected)
- `/account` page — profile card + paginated order list with status badges
- `/account/orders/[orderNumber]` — full order detail: items, delivery address, pricing
- `apiAuth` utility to extract and verify JWT from `Authorization: Bearer` header
- Navbar user dropdown: "My Account" link

---

## [0.11.0] — 2026-05-07

### Added

- Checkout page: delivery form + mock payment form (React Hook Form + Zod)
- Server-side pricing computation in `POST /api/orders` (never trusts client totals)
- Promo codes: `TESCO10` (10%), `FRESH5` (5%), `SAVE15` (15%)
- Order model (`Mongoose`) with status enum and indexes
- `/checkout/confirmation` page with order number and next-steps UI
- Free delivery threshold at £40

---

## [0.10.0] — 2026-05-07

### Added

- Category index page (`/categories`) — grid of all categories
- Dynamic category pages (`/categories/[category]`) with hero, filters, and product grid
- `CategoryFilters` component — price range pills and in-stock toggle (URL-driven)
- `generateStaticParams` for all 10 category slugs
- 10 categories: Fresh Food, Bakery, Dairy & Eggs, Meat & Fish, Frozen, Drinks, Snacks, Household, Health & Beauty, Baby

---

## [0.9.0] — 2026-05-07

### Added

- Register page with Zod validation (name, email, password strength, confirm password)
- Login page with redirect support (`?redirect=` param)
- JWT authentication — 7-day tokens, signed with `JWT_SECRET`
- `auth.service`: `registerUser`, `loginUser`, `signToken`, `verifyToken`
- Zustand `auth.store` with localStorage persistence
- Navbar: user dropdown (name, email, sign out) vs "Sign in" link when logged out

---

## [0.8.0] — 2026-05-07

### Added

- MongoDB connection with global cache (`__mongoCache`) for Next.js hot-reload safety
- `isDBConfigured()` helper — graceful mock fallback when `MONGODB_URI` is unset
- `Product`, `User`, and `Order` Mongoose models
- Product service (`getProducts`, `getProductBySlug`, `getAllProductSlugs`, `getCategories`)
- `POST /api/seed` — dev-only data seeding from mock dataset
- `GET /api/products`, `GET /api/products/[id]`, `GET /api/categories`

---

## [0.7.0] — 2026-05-07

### Added

- Core shop UI: homepage (hero, promo strip, category grid, featured products)
- Product listing page with filters sidebar, sort, and pagination
- Product detail page with image gallery, add-to-cart, related products
- Shopping cart page with quantity controls and summary
- Search page with relevance scoring
- Navbar with search, cart badge, and category nav bar
- Footer
- Zustand cart store with localStorage persistence

---

## [0.1.0] — 2026-05-07

### Added

- Initial Next.js 16 project scaffold (Create Next App)
